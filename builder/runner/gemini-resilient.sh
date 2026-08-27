#!/bin/sh
set -u

MODEL="${1:-gemini-3.5-flash}"
PROMPT="${2:-}"
FALLBACK_MODEL="${BUILDER_AGENT_FALLBACK_MODEL:-gemini-3.5-flash-lite}"
ATTEMPT_TIMEOUT_SECONDS="${BUILDER_AGENT_ATTEMPT_TIMEOUT_SECONDS:-720}"
TMP_OUTPUT="$(mktemp)"

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

run_model "$MODEL"
STATUS=$?

if [ "$STATUS" -eq 0 ]; then
  exit 0
fi

# Gemini documents 500/503 as transient server-side failures and recommends
# bounded retry/backoff; switching models is also recommended when capacity is
# model-specific. Do not retry forever inside the bounded worker.
if [ "$MODEL" != "$FALLBACK_MODEL" ] && {
  [ "$STATUS" -eq 124 ] ||
  grep -Eiq '(^|[^0-9])50[023]([^0-9]|$)|service unavailable|high demand|temporarily overloaded|capacity exhausted|internal server error|unavailable';
} < "$TMP_OUTPUT"; then
  echo "[resilient-gemini] Primary model $MODEL hit a transient/timeout failure; switching to fallback model $FALLBACK_MODEL." >&2
  sleep 5
  run_model "$FALLBACK_MODEL"
  exit $?
fi

exit "$STATUS"
