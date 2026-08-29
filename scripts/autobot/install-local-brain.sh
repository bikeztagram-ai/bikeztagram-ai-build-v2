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

# 3B is the default because the builder must produce useful production code,
# not merely plausible-looking edits. The smaller model remains an explicit
# fallback for constrained runners.
MODEL="${LOCAL_AI_MODEL:-qwen2.5-coder:3b}"
echo "[autobot] pulling local coding model: $MODEL"
if ! ollama pull "$MODEL"; then
  if [[ -z "${LOCAL_AI_MODEL:-}" ]]; then
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
