#!/bin/sh
set -u

MODEL="${1:-gemini-3.5-flash}"
PROMPT="${2:-}"
FALLBACK_MODEL="${BUILDER_AGENT_FALLBACK_MODEL:-gemini-3.5-flash-lite}"
ATTEMPT_TIMEOUT_SECONDS="${BUILDER_AGENT_ATTEMPT_TIMEOUT_SECONDS:-720}"
RETRY_MAX_SECONDS="${BUILDER_GEMINI_RETRY_MAX_SECONDS:-120}"
TMP_OUTPUT="$(mktemp)"
CIRCUIT_FILE="${AUTOBOT_GEMINI_CIRCUIT_FILE:-/tmp/autobot-gemini-fallback-exhausted}"

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
  # Gemini/CLI output can expose retry timing as "retry after 20s",
  # "retry in 20 seconds", or JSON-ish "retryDelay: 20s". Keep the
  # automatic wait bounded so a provider response cannot consume the whole job.
  grep -Eio 'retry(ing)?[[:space:]]*(after|in)[[:space:]]+[0-9]+([.][0-9]+)?[[:space:]]*(s|sec|secs|second|seconds)' "$TMP_OUTPUT" \
    | tail -n 1 \
    | grep -Eo '[0-9]+([.][0-9]+)?' \
    | head -n 1
}

is_hard_quota() {
  grep -Eiq 'daily quota|quota exceeded|quota exhausted|insufficient quota|billing.*quota|resource exhausted.*quota|usage limit.*reached|limit.*reached.*quota|no provider retry delay' "$TMP_OUTPUT"
}

is_rate_limited() {
  grep -Eiq '(^|[^0-9])429([^0-9]|$)|resource exhausted|rate limit|too many requests|retry.?after|retry.?in' "$TMP_OUTPUT"
}

is_transient_capacity() {
  [ "$1" -eq 124 ] || grep -Eiq '(^|[^0-9])50[023]([^0-9]|$)|service unavailable|high demand|temporarily overloaded|capacity exhausted|internal server error|unavailable' "$TMP_OUTPUT"
}

# A failed fallback is a batch-level provider circuit-breaker event. The
# surrounding worker may run another engineering pass, but it must not keep
# sending the same primary/fallback requests after both models have failed.
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

# A 429 can be a short rolling RPM/TPM/spend limit rather than a depleted
# daily quota. If the provider tells us when to retry, honour one bounded wait
# and retry the SAME model once. This avoids treating every 429 as a dead batch.
if is_rate_limited; then
  if is_hard_quota; then
    echo "[resilient-gemini] HARD_QUOTA: Gemini reported a quota/usage limit with no safe provider retry. Stopping without model thrashing." >&2
    exit 125
  fi
  DELAY="$(retry_delay_seconds || true)"
  if [ -n "$DELAY" ]; then
    case "$DELAY" in
      *.*) DELAY_INT="${DELAY%%.*}" ;;
      *) DELAY_INT="$DELAY" ;;
    esac
    if [ "$DELAY_INT" -gt "$RETRY_MAX_SECONDS" ]; then DELAY_INT="$RETRY_MAX_SECONDS"; fi
    if [ "$DELAY_INT" -lt 1 ]; then DELAY_INT=1; fi
    echo "[resilient-gemini] RATE_LIMIT: provider supplied a retry delay; waiting ${DELAY_INT}s then retrying $MODEL once." >&2
    sleep "$DELAY_INT"
    run_model "$MODEL"
    RETRY_STATUS=$?
    if [ "$RETRY_STATUS" -eq 0 ]; then
      rm -f "$CIRCUIT_FILE"
      exit 0
    fi
    if is_hard_quota; then
      echo "[resilient-gemini] HARD_QUOTA: retry still reports exhausted quota/usage. Stopping this batch." >&2
      exit 125
    fi
    STATUS="$RETRY_STATUS"
  else
    echo "[resilient-gemini] RATE_LIMIT: HTTP 429/rate-limit response without a provider retry delay; trying the configured fallback once." >&2
  fi
fi

# Gemini documents 500/503 as transient server-side failures and recommends
# bounded retry/backoff; switching models is also appropriate when capacity is
# model-specific. Do not retry forever inside the bounded worker.
if [ "$MODEL" != "$FALLBACK_MODEL" ] && is_transient_capacity "$STATUS"; then
  echo "[resilient-gemini] Primary model $MODEL hit a transient/timeout failure; switching to fallback model $FALLBACK_MODEL." >&2
  sleep 5
  run_model "$FALLBACK_MODEL"
  FALLBACK_STATUS=$?
  if [ "$FALLBACK_STATUS" -eq 0 ]; then
    rm -f "$CIRCUIT_FILE"
    exit 0
  fi
  touch "$CIRCUIT_FILE"
  echo "[resilient-gemini] Fallback model $FALLBACK_MODEL also failed; opening provider circuit for this batch and stopping further model switching." >&2
  exit "$FALLBACK_STATUS"
fi

# A generic rate limit without a retry hint may be model-specific. Give the
# fallback exactly one chance, but never loop back to the primary.
if [ "$MODEL" != "$FALLBACK_MODEL" ] && is_rate_limited; then
  sleep 5
  run_model "$FALLBACK_MODEL"
  FALLBACK_STATUS=$?
  if [ "$FALLBACK_STATUS" -eq 0 ]; then
    rm -f "$CIRCUIT_FILE"
    exit 0
  fi
  touch "$CIRCUIT_FILE"
  echo "[resilient-gemini] Fallback model $FALLBACK_MODEL also hit a provider limit; opening circuit and stopping further model switching." >&2
  exit "$FALLBACK_STATUS"
fi

exit "$STATUS"
