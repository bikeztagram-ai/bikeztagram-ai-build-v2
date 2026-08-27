#!/bin/sh
set -u

MODEL="${1:-gemini-3.5-flash}"
PROMPT="${2:-}"
FALLBACK_MODEL="${BUILDER_AGENT_FALLBACK_MODEL:-gemini-3.5-flash-lite}"
ATTEMPT_TIMEOUT_SECONDS="${BUILDER_AGENT_ATTEMPT_TIMEOUT_SECONDS:-720}"
RETRY_MAX_SECONDS="${BUILDER_GEMINI_RETRY_MAX_SECONDS:-120}"
TMP_OUTPUT="$(mktemp)"
CIRCUIT_FILE="${AUTOBOT_GEMINI_CIRCUIT_FILE:-/tmp/autobot-gemini-fallback-exhausted}"
RATE_LIMIT_FILE="${AUTOBOT_GEMINI_RATE_LIMIT_FILE:-/tmp/autobot-gemini-rate-limited}"

cleanup() {
  rm -f "$TMP_OUTPUT"
}
trap cleanup EXIT

run_model() {
  local model="$1"
  echo "[resilient-gemini] Starting model: $model (timeout ${ATTEMPT_TIMEOUT_SECONDS}s)" >&2
  : > "$TMP_OUTPUT"
  timeout --signal=TERM --kill-after=30s "${ATTEMPT_TIMEOUT_SECONDS}s" \
    npx --yes @google/gemini-cli@latest \
      --yolo --skip-trust --model "$model" -p "$PROMPT" \
      >"$TMP_OUTPUT" 2>&1
  local status=$?
  cat "$TMP_OUTPUT"
  return "$status"
}

retry_delay_seconds() {
  grep -Eio 'retry(ing)?[[:space:]]*(after|in)[[:space:]]+[0-9]+([.][0-9]+)?[[:space:]]*(s|sec|secs|second|seconds)' "$TMP_OUTPUT" \
    | tail -n 1 \
    | grep -Eo '[0-9]+([.][0-9]+)?' \
    | head -n 1
}

is_hard_quota() {
  grep -Eiq 'daily quota|quota exceeded|quota exhausted|insufficient quota|billing.*quota|resource exhausted.*quota|usage limit.*reached|limit.*reached.*quota|prepay.*depleted|prepayment.*depleted|credit.*depleted|no provider retry delay' "$TMP_OUTPUT"
}

is_rate_limited() {
  grep -Eiq '(^|[^0-9])429([^0-9]|$)|resource exhausted|rate limit|too many requests|retry.?after|retry.?in' "$TMP_OUTPUT"
}

is_transient_capacity() {
  [ "$1" -eq 124 ] || grep -Eiq '(^|[^0-9])50[023]([^0-9]|$)|service unavailable|high demand|temporarily overloaded|capacity exhausted|internal server error|unavailable' "$TMP_OUTPUT"
}

if [ "$MODEL" != "$FALLBACK_MODEL" ] && [ -f "$CIRCUIT_FILE" ]; then
  echo "[resilient-gemini] Provider circuit is open after a previous primary/fallback failure; refusing another model switch in this batch." >&2
  exit 125
fi

run_model "$MODEL"
STATUS=$?

if [ "$STATUS" -eq 0 ]; then
  rm -f "$CIRCUIT_FILE"
  exit 0
fi

# Rate limits are treated as a cost-control event, not a reason to fan out
# into more paid requests. We retry the SAME model at most once only when the
# provider supplies an explicit retry delay. Any unresolved 429/quota/billing
# signal stops this batch. A fallback is deliberately NOT attempted for 429s.
if is_rate_limited; then
  touch "$RATE_LIMIT_FILE"
  if is_hard_quota; then
    echo "[resilient-gemini] HARD_QUOTA: Gemini reported exhausted quota, prepaid credits, or usage limit. Stopping immediately without fallback." >&2
    exit 125
  fi
  DELAY="$(retry_delay_seconds || true)"
  if [ -z "$DELAY" ]; then
    echo "[resilient-gemini] RATE_LIMIT: 429/rate-limit response without a provider retry delay. Stopping immediately without fallback." >&2
    exit 125
  fi
  case "$DELAY" in
    *.*) DELAY_INT="${DELAY%%.*}" ;;
    *) DELAY_INT="$DELAY" ;;
  esac
  if [ "$DELAY_INT" -gt "$RETRY_MAX_SECONDS" ]; then DELAY_INT="$RETRY_MAX_SECONDS"; fi
  if [ "$DELAY_INT" -lt 1 ]; then DELAY_INT=1; fi
  echo "[resilient-gemini] RATE_LIMIT: provider supplied retry delay; waiting ${DELAY_INT}s then retrying $MODEL once." >&2
  sleep "$DELAY_INT"
  run_model "$MODEL"
  RETRY_STATUS=$?
  if [ "$RETRY_STATUS" -eq 0 ]; then
    echo "[resilient-gemini] RATE_LIMIT_RECOVERED: request succeeded after bounded retry; no further Gemini pass will be started in this batch." >&2
    rm -f "$CIRCUIT_FILE"
    exit 0
  fi
  if is_rate_limited || is_hard_quota; then
    echo "[resilient-gemini] RATE_LIMIT_STOP: bounded retry still reports a provider limit. Stopping this batch." >&2
    exit 125
  fi
  STATUS="$RETRY_STATUS"
fi

# Only transient server/capacity failures (500/503 or the command timeout)
# are eligible for one model fallback. This prevents 429s from doubling the
# spend and keeps model switching bounded.
if [ "$MODEL" != "$FALLBACK_MODEL" ] && is_transient_capacity "$STATUS"; then
  echo "[resilient-gemini] Primary model $MODEL hit a transient/timeout failure; switching once to fallback model $FALLBACK_MODEL." >&2
  sleep 5
  run_model "$FALLBACK_MODEL"
  FALLBACK_STATUS=$?
  if [ "$FALLBACK_STATUS" -eq 0 ]; then
    rm -f "$CIRCUIT_FILE"
    exit 0
  fi
  if is_rate_limited || is_hard_quota; then
    touch "$RATE_LIMIT_FILE"
    echo "[resilient-gemini] FALLBACK_LIMIT: fallback model hit a provider limit; stopping the batch." >&2
    exit 125
  fi
  touch "$CIRCUIT_FILE"
  echo "[resilient-gemini] Fallback model $FALLBACK_MODEL also failed; opening provider circuit for this batch and stopping further model switching." >&2
  exit "$FALLBACK_STATUS"
fi

exit "$STATUS"
