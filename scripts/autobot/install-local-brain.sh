#!/usr/bin/env bash
set -euo pipefail

# Bikeztagram's autonomous builder uses a local coding model only.
# No OpenAI, Gemini, or other provider API is required for the builder brain.
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

export OLLAMA_HOST="127.0.0.1:11434"
nohup ollama serve >/tmp/bikeztagram-ollama.log 2>&1 &
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then break; fi
  sleep 2
done

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

curl -fsS http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}],\"options\":{\"num_ctx\":2048,\"num_predict\":16}}" \
  >/tmp/bikeztagram-ollama-smoke.json

if [[ "$DISCOVERY_MODEL" != "$MODEL" ]]; then
  curl -fsS http://127.0.0.1:11434/api/chat \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"$DISCOVERY_MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}],\"options\":{\"num_ctx\":2048,\"num_predict\":16}}" \
    >/tmp/bikeztagram-discovery-smoke.json
fi

echo "LOCAL_AI_READY=1" >> "$GITHUB_ENV"
echo "OLLAMA_HOST=http://127.0.0.1:11434" >> "$GITHUB_ENV"
echo "LOCAL_AI_MODEL=$MODEL" >> "$GITHUB_ENV"
echo "AUTOBOT_DISCOVERY_MODEL=$DISCOVERY_MODEL" >> "$GITHUB_ENV"
echo "[autobot] local AI brain is ready; no paid AI API configured."
