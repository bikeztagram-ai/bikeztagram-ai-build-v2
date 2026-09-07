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

# Smoke-test both ordinary inference and the exact function-calling capability
# required by the feature brain. HTTP 200 alone is not enough to declare the
# coding agent ready.
curl -fsS http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}]}" \
  >/tmp/bikeztagram-ollama-smoke.json

curl -fsS http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"stream\":false,\"tools\":[{\"type\":\"function\",\"function\":{\"name\":\"probe\",\"description\":\"A readiness probe.\",\"parameters\":{\"type\":\"object\",\"properties\":{},\"required\":[]}}}],\"messages\":[{\"role\":\"user\",\"content\":\"Call the probe tool exactly once. Do not answer normally.\"}]}" \
  >/tmp/bikeztagram-ollama-tool-smoke.json

node --input-type=module -e '
import fs from "node:fs";
const plain=JSON.parse(fs.readFileSync("/tmp/bikeztagram-ollama-smoke.json","utf8"));
const content=String(plain.message?.content||plain.response||"").trim();
if(!content) throw new Error("Ollama returned HTTP success but no assistant content");
const tool=JSON.parse(fs.readFileSync("/tmp/bikeztagram-ollama-tool-smoke.json","utf8"));
const calls=tool.message?.tool_calls || [];
if(!calls.length) throw new Error("Ollama model is not producing tool calls required by the agentic feature brain");
if(calls[0]?.function?.name !== "probe") throw new Error(`Ollama tool smoke called ${calls[0]?.function?.name||"no function"} instead of probe`);
console.log(`[autobot] local model smoke response: ${JSON.stringify(content.slice(0,120))}`);
console.log(`[autobot] local model tool-call smoke: ${calls.length} call(s), first=${calls[0].function.name}`);
'

echo "LOCAL_AI_READY=1" >> "$GITHUB_ENV"
echo "OLLAMA_HOST=http://127.0.0.1:11434" >> "$GITHUB_ENV"
echo "LOCAL_AI_MODEL=$MODEL" >> "$GITHUB_ENV"
echo "[autobot] local AI brain is ready; model=$MODEL; ordinary inference and tool calling both passed; no paid AI API configured."
