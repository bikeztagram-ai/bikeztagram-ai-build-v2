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

MODEL="${LOCAL_AI_MODEL:-qwen3:8b}"
if [[ "$MODEL" == "qwen2.5-coder:1.5b" || "$MODEL" == "qwen2.5-coder:1.5b-instruct" ]]; then
  echo "[autobot] legacy 1.5B model requested; promoting local agent brain to qwen3:8b"
  MODEL="qwen3:8b"
fi

echo "[autobot] pulling local coding model: $MODEL"
if ! ollama pull "$MODEL"; then
  if [[ -z "${LOCAL_AI_MODEL:-}" ]]; then
    MODEL="qwen3:8b"
    echo "[autobot] requested default unavailable; falling back to $MODEL"
    ollama pull "$MODEL"
  else
    exit 1
  fi
fi

validate_model() {
  local think_field=''
  if [[ "$MODEL" == qwen3:* ]]; then
    think_field=',"think":true'
  fi

  curl -fsS http://127.0.0.1:11434/api/chat \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"$MODEL\",\"stream\":false${think_field},\"messages\":[{\"role\":\"user\",\"content\":\"Reply with READY only.\"}]}" \
    >/tmp/bikeztagram-ollama-smoke.json

  curl -fsS http://127.0.0.1:11434/api/chat \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"$MODEL\",\"stream\":false${think_field},\"tools\":[{\"type\":\"function\",\"function\":{\"name\":\"probe\",\"description\":\"A readiness probe.\",\"parameters\":{\"type\":\"object\",\"properties\":{},\"required\":[]}}}],\"messages\":[{\"role\":\"user\",\"content\":\"You are in an agent tool loop. Call the probe tool exactly once now. Do not answer normally until after the tool call.\"}]}" \
    >/tmp/bikeztagram-ollama-tool-smoke.json

  node --input-type=module -e '
import fs from "node:fs";
const plain=JSON.parse(fs.readFileSync("/tmp/bikeztagram-ollama-smoke.json","utf8"));
const content=String(plain.message?.content||plain.response||"").trim();
if(!content) throw new Error("Ollama returned HTTP success but no assistant content");
const tool=JSON.parse(fs.readFileSync("/tmp/bikeztagram-ollama-tool-smoke.json","utf8"));
const calls=tool.message?.tool_calls || [];
if(!calls.length) throw new Error("model produced no native tool calls");
if(calls[0]?.function?.name !== "probe") throw new Error(`model called ${calls[0]?.function?.name||"no function"} instead of probe`);
console.log(`[autobot] local model smoke response: ${JSON.stringify(content.slice(0,120))}`);
console.log(`[autobot] local model tool-call smoke: ${calls.length} call(s), first=${calls[0].function.name}`);
'
}

# Qwen2.5-Coder is a capable coding model, but the autonomous builder needs
# reliable native tool calls, not merely good text generation. If the requested
# model fails the real tool-call contract, switch to Qwen3 8B, whose Ollama
# template is explicitly designed for tool-calling agent loops.
if ! validate_model; then
  if [[ "$MODEL" != "qwen3:8b" ]]; then
    echo "[autobot] model=$MODEL failed native tool-call readiness; switching to qwen3:8b"
    MODEL="qwen3:8b"
    ollama pull "$MODEL"
    validate_model
  else
    echo '[autobot] qwen3:8b failed the native tool-call readiness contract.'
    cat /tmp/bikeztagram-ollama-tool-smoke.json || true
    exit 1
  fi
fi

echo "LOCAL_AI_READY=1" >> "$GITHUB_ENV"
echo "OLLAMA_HOST=http://127.0.0.1:11434" >> "$GITHUB_ENV"
echo "LOCAL_AI_MODEL=$MODEL" >> "$GITHUB_ENV"
echo "[autobot] local AI brain is ready; model=$MODEL; ordinary inference and native tool calling both passed; no paid AI API configured."
