#!/usr/bin/env bash
set -euo pipefail

# Free/local AI only. No provider API keys are used.
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

export OLLAMA_HOST="127.0.0.1:11434"
nohup ollama serve >/tmp/bikeztagram-ollama.log 2>&1 &
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then break; fi
  sleep 2
done

MODEL="${LOCAL_AI_MODEL:-qwen2.5-coder:1.5b-instruct}"
echo "[autobot] pulling local coding model: $MODEL"
ollama pull "$MODEL"

curl -fsS http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}]}" \
  >/tmp/bikeztagram-ollama-smoke.json

echo "LOCAL_AI_READY=1" >> "$GITHUB_ENV"
echo "OLLAMA_HOST=http://127.0.0.1:11434" >> "$GITHUB_ENV"
echo "LOCAL_AI_MODEL=$MODEL" >> "$GITHUB_ENV"
echo "[autobot] local AI brain is ready; no paid AI API configured."
