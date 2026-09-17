#!/usr/bin/env bash
set -euo pipefail

# Bikeztagram's autonomous builder uses a local coding model only.
# No OpenAI, Gemini, or other provider API is required for the builder brain.
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

# Keep the Ollama lifecycle owned by this script. In particular, do not start
# a second server when a healthy instance is already listening on 11434.
# This prevents the "bind: address already in use" failure seen in long runs.
export OLLAMA_HOST="127.0.0.1:11434"
OLLAMA_URL="http://127.0.0.1:11434"
OLLAMA_LOG="/tmp/bikeztagram-ollama.log"
OLLAMA_PID_FILE="/tmp/bikeztagram-ollama.pid"

ollama_is_ready() {
  curl -fsS --max-time 3 "$OLLAMA_URL/api/tags" >/dev/null 2>&1
}

if ollama_is_ready; then
  echo "[autobot] reusing healthy Ollama server on 127.0.0.1:11434"
else
  # If a stale pid file points at a live Ollama process, give it a chance to
  # become ready before attempting another bind.
  if [[ -f "$OLLAMA_PID_FILE" ]]; then
    existing_pid="$(cat "$OLLAMA_PID_FILE" 2>/dev/null || true)"
    if [[ "$existing_pid" =~ ^[0-9]+$ ]] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "[autobot] Ollama process $existing_pid already exists; waiting for readiness"
    else
      rm -f "$OLLAMA_PID_FILE"
    fi
  fi

  if ! ollama_is_ready; then
    echo "[autobot] starting Ollama server on 127.0.0.1:11434"
    nohup ollama serve >"$OLLAMA_LOG" 2>&1 &
    ollama_pid=$!
    echo "$ollama_pid" > "$OLLAMA_PID_FILE"
  fi

  ready=false
  for i in $(seq 1 60); do
    if ollama_is_ready; then
      ready=true
      break
    fi
    # If the process we started died immediately, fail with its log instead of
    # launching another copy and masking the original lifecycle problem.
    if [[ -n "${ollama_pid:-}" ]] && ! kill -0 "$ollama_pid" 2>/dev/null; then
      echo '[autobot] Ollama exited before becoming ready:' >&2
      tail -n 120 "$OLLAMA_LOG" >&2 || true
      exit 1
    fi
    sleep 2
done
  if [[ "$ready" != true ]]; then
    echo '[autobot] Ollama did not become ready within 120 seconds' >&2
    tail -n 120 "$OLLAMA_LOG" >&2 || true
    exit 1
  fi
fi

# Qwen2.5-Coder 7B is the default coding brain. Discovery can use a smaller
# dedicated model so planning does not consume the long CPU budget needed by
# the specialist Builders.
MODEL="${LOCAL_AI_MODEL:-qwen2.5-coder:7b}"
if [[ "$MODEL" == "qwen2.5-coder:1.5b" || "$MODEL" == "qwen2.5-coder:1.5b-instruct" ]]; then
  echo "[autobot] legacy 1.5B model requested; promoting local coding brain to qwen2.5-coder:7b"
  MODEL="qwen2.5-coder:7b"
fi

DISCOVERY_MODEL="${AUTOBOT_DISCOVERY_MODEL:-$MODEL}"
if [[ "$DISCOVERY_MODEL" == "qwen2.5-coder:1.5b" || "$DISCOVERY_MODEL" == "qwen2.5-coder:1.5b-instruct" ]]; then
  DISCOVERY_MODEL="qwen2.5-coder:3b"
fi

echo "[autobot] pulling local coding model: $MODEL"
if ! ollama pull "$MODEL"; then
  if [[ "$MODEL" == "qwen2.5-coder:7b" && -z "${LOCAL_AI_MODEL:-}" ]]; then
    MODEL="qwen2.5-coder:3b"
    echo "[autobot] 7B model unavailable; falling back to $MODEL"
    ollama pull "$MODEL"
  else
    exit 1
  fi
fi

if [[ "$DISCOVERY_MODEL" != "$MODEL" ]]; then
  echo "[autobot] pulling dedicated discovery model: $DISCOVERY_MODEL"
  ollama pull "$DISCOVERY_MODEL"
fi

curl -fsS "$OLLAMA_URL/api/chat" \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}],\"options\":{\"num_ctx\":2048,\"num_predict\":16}}" \
  >/tmp/bikeztagram-ollama-smoke.json

if [[ "$DISCOVERY_MODEL" != "$MODEL" ]]; then
  curl -fsS "$OLLAMA_URL/api/chat" \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"$DISCOVERY_MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}],\"options\":{\"num_ctx\":2048,\"num_predict\":16}}" \
    >/tmp/bikeztagram-discovery-smoke.json
fi

echo "LOCAL_AI_READY=1" >> "$GITHUB_ENV"
echo "OLLAMA_HOST=http://127.0.0.1:11434" >> "$GITHUB_ENV"
echo "LOCAL_AI_MODEL=$MODEL" >> "$GITHUB_ENV"
echo "AUTOBOT_DISCOVERY_MODEL=$DISCOVERY_MODEL" >> "$GITHUB_ENV"
echo "[autobot] local AI brain is ready; no paid AI API configured."
