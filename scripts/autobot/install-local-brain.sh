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

# The legacy 1.5B model was too weak/slow for production code generation.
# Treat that old default as stale and automatically promote it to 3B.
MODEL="${LOCAL_AI_MODEL:-qwen2.5-coder:3b}"
if [[ "$MODEL" == "qwen2.5-coder:1.5b" || "$MODEL" == "qwen2.5-coder:1.5b-instruct" ]]; then
  echo "[autobot] legacy 1.5B model requested; promoting local coding brain to qwen2.5-coder:3b"
  MODEL="qwen2.5-coder:3b"
fi

echo "[autobot] pulling local coding model: $MODEL"
if ! ollama pull "$MODEL"; then
  if [[ "$MODEL" == "qwen2.5-coder:3b" && -z "${LOCAL_AI_MODEL:-}" ]]; then
    MODEL="qwen2.5-coder:1.5b-instruct"
    echo "[autobot] 3B model unavailable; falling back to $MODEL"
    ollama pull "$MODEL"
  else
    exit 1
  fi
fi

curl -fsS http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}]}" \
  >/tmp/bikeztagram-ollama-smoke.json

echo "LOCAL_AI_READY=1" >> "$GITHUB_ENV"
echo "OLLAMA_HOST=http://127.0.0.1:11434" >> "$GITHUB_ENV"
echo "LOCAL_AI_MODEL=$MODEL" >> "$GITHUB_ENV"
echo "[autobot] local AI brain is ready; no paid AI API configured."
