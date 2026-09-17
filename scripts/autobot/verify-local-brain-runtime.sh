#!/usr/bin/env bash
set -euo pipefail

# This is intentionally a small, deterministic gate. It proves the exact
# local-brain lifecycle used by AutoBot specialists before an endurance run.
# It must catch duplicate Ollama startup, proxy breakage, and Aider/provider
# connectivity without spending an hour on a full specialist run.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

export LOCAL_AI_MODEL="${LOCAL_AI_MODEL:-qwen2.5-coder:7b}"
export AUTOBOT_DISCOVERY_MODEL="${AUTOBOT_DISCOVERY_MODEL:-qwen2.5-coder:3b}"
export LOCAL_AI_PROXY_NUM_CTX="${LOCAL_AI_PROXY_NUM_CTX:-2048}"
export LOCAL_AI_PROXY_NUM_PREDICT="${LOCAL_AI_PROXY_NUM_PREDICT:-128}"

bash scripts/autobot/install-local-brain.sh
# Calling the lifecycle entry point twice is deliberate: the second call must
# reuse the healthy server rather than trying to bind a second copy.
bash scripts/autobot/install-local-brain.sh

if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null; then
  echo '[autobot-smoke] Ollama upstream is not healthy' >&2
  exit 1
fi

nohup node builder/runner/ollama-performance-proxy.mjs >/tmp/bikeztagram-runtime-smoke-proxy.log 2>&1 &
proxy_pid=$!
cleanup() {
  kill "$proxy_pid" 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:11435/health >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:11435/health >/dev/null

export OLLAMA_HOST="http://127.0.0.1:11435"
export OLLAMA_API_BASE="http://127.0.0.1:11435"

# Prove the proxy can reach the selected coding model.
curl --fail --silent --show-error --max-time 120 \
  http://127.0.0.1:11435/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"${LOCAL_AI_MODEL}\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}],\"options\":{\"num_ctx\":1024,\"num_predict\":16}}" \
  >/tmp/bikeztagram-runtime-smoke-proxy.json
node -e "const x=require('/tmp/bikeztagram-runtime-smoke-proxy.json'); if(!x.message?.content && !x.response) process.exit(1); console.log('[autobot-smoke] proxy/model request passed')"

# Prove Aider itself can use the same provider path. The change is deliberately
# tiny and disposable; this is a connectivity/lifecycle test, not product work.
SMOKE_DIR="$(mktemp -d)"
trap 'rm -rf "$SMOKE_DIR"; kill "$proxy_pid" 2>/dev/null || true' EXIT
cat > "$SMOKE_DIR/smoke.js" <<'EOF'
const SMOKE_STATUS = 'PENDING';
console.log(SMOKE_STATUS);
EOF

cd "$SMOKE_DIR"
aider \
  --model "ollama_chat/${LOCAL_AI_MODEL}" \
  --message "Change only SMOKE_STATUS from PENDING to READY in smoke.js. Do not modify anything else." \
  --yes-always \
  --no-git \
  smoke.js >/tmp/bikeztagram-aider-runtime-smoke.log 2>&1

grep -q "SMOKE_STATUS = 'READY'" smoke.js

echo '[autobot-smoke] Aider provider/edit request passed'

# Confirm exactly one listener exists and reject the duplicate-bind signature
# that caused the previous endurance run to fail.
listener_count="$(ss -ltn 2>/dev/null | awk '$4 ~ /127\.0\.0\.1:11434$/ {count++} END {print count+0}')"
if [[ "$listener_count" != "1" ]]; then
  echo "[autobot-smoke] expected exactly one Ollama listener on 11434; found $listener_count" >&2
  exit 1
fi

if grep -Eq 'bind: address already in use|address already in use' /tmp/bikeztagram-ollama.log 2>/dev/null; then
  echo '[autobot-smoke] duplicate Ollama bind detected in server log' >&2
  tail -n 120 /tmp/bikeztagram-ollama.log >&2 || true
  exit 1
fi

echo '[autobot-smoke] PASS: Ollama lifecycle, proxy, model, Aider, and single-listener checks all passed.'
