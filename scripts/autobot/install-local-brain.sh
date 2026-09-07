#!/usr/bin/env bash
set -euo pipefail

# Bikeztagram's autonomous builder uses a local coding model only.
# No OpenAI, Gemini, or other provider API is required for the builder brain.
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

export OLLAMA_HOST="127.0.0.1:11434"
nohup ollama serve >/tmp/bikeztagram-ollama.log 2>&1 &
ready=false
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  echo '[autobot] Ollama API did not become ready within 60s.'
  cat /tmp/bikeztagram-ollama.log || true
  exit 1
fi

# Qwen2.5-Coder 7B is the default: it is small enough for the standard
# 4-vCPU/16-GB hosted runner while materially stronger than the old 3B brain.
# An explicit model request is respected; only the implicit default may fall
# back to 3B if the 7B pull itself is unavailable.
MODEL="${LOCAL_AI_MODEL:-qwen2.5-coder:7b}"
if [[ "$MODEL" == "qwen2.5-coder:1.5b" || "$MODEL" == "qwen2.5-coder:1.5b-instruct" ]]; then
  echo "[autobot] legacy 1.5B model requested; promoting local coding brain to qwen2.5-coder:7b"
  MODEL="qwen2.5-coder:7b"
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

# Warm the selected model and verify that the API returned a usable assistant
# message. HTTP 200 alone is not enough to declare the coding brain ready.
curl -fsS http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}]}" \
  >/tmp/bikeztagram-ollama-smoke.json

node --input-type=module -e '
import fs from "node:fs";
const payload=JSON.parse(fs.readFileSync("/tmp/bikeztagram-ollama-smoke.json","utf8"));
const content=String(payload.message?.content||payload.response||"").trim();
if(!content) throw new Error("Ollama returned HTTP success but no assistant content");
console.log(`[autobot] local model smoke response: ${JSON.stringify(content.slice(0,120))}`);
'

echo "LOCAL_AI_READY=1" >> "$GITHUB_ENV"
echo "OLLAMA_HOST=http://127.0.0.1:11434" >> "$GITHUB_ENV"
echo "LOCAL_AI_MODEL=$MODEL" >> "$GITHUB_ENV"
echo "[autobot] local AI brain is ready; model=$MODEL; no paid AI API configured."
