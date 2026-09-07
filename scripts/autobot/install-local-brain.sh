#!/usr/bin/env bash
set -euo pipefail

# Bikeztagram's autonomous builder uses a local coding model only.
# No OpenAI, Gemini, or other provider API is required for the builder brain.
if ! command -v ollama >/dev/null 2>&1; then curl -fsSL https://ollama.com/install.sh | sh; fi
export OLLAMA_HOST="127.0.0.1:11434"
nohup ollama serve >/tmp/bikeztagram-ollama.log 2>&1 &
ready=false
for i in $(seq 1 30); do if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then ready=true; break; fi; sleep 2; done
if [[ "$ready" != true ]]; then echo '[autobot] Ollama API did not become ready within 60s.'; cat /tmp/bikeztagram-ollama.log || true; exit 1; fi
MODEL="${LOCAL_AI_MODEL:-qwen3:4b}"
echo "[autobot] pulling local coding model: $MODEL"
if ! ollama pull "$MODEL"; then
  echo "[autobot] failed to pull requested local model: $MODEL"
  exit 1
fi
validate_model() {
  curl -fsS --max-time 90 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d "{\"model\":\"$MODEL\",\"stream\":false,\"think\":false,\"options\":{\"temperature\":0,\"num_ctx\":4096,\"num_predict\":200},\"messages\":[{\"role\":\"user\",\"content\":\"Reply READY.\"}]}" >/tmp/bikeztagram-ollama-smoke.json
  local tool_prompt='You are a tool-calling agent. You MUST call the function named probe exactly once. Do not explain, reason, or answer in prose. Emit the tool call now.'
  curl -fsS --max-time 90 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d "{\"model\":\"$MODEL\",\"stream\":false,\"think\":false,\"tools\":[{\"type\":\"function\",\"function\":{\"name\":\"probe\",\"description\":\"Required readiness probe. Call this function to confirm tool use.\",\"parameters\":{\"type\":\"object\",\"properties\":{\"check\":{\"type\":\"string\",\"description\":\"Use the literal value READY\"}},\"required\":[\"check\"]}}}],\"options\":{\"temperature\":0,\"num_ctx\":4096,\"num_predict\":200},\"messages\":[{\"role\":\"user\",\"content\":\"$tool_prompt\"}]}" >/tmp/bikeztagram-ollama-tool-smoke.json
  if ! node --input-type=module -e 'import fs from "node:fs"; const p=JSON.parse(fs.readFileSync("/tmp/bikeztagram-ollama-smoke.json","utf8")); if(!String(p.message?.content||p.response||"").trim()) throw new Error("no assistant content"); const t=JSON.parse(fs.readFileSync("/tmp/bikeztagram-ollama-tool-smoke.json","utf8")); const c=t.message?.tool_calls||[]; const raw=String(t.message?.content||""); const xml=/<tool_call>\s*\{[\s\S]*?"name"\s*:\s*"probe"[\s\S]*?\}\s*<\/tool_call>/.test(raw); if(!c.length && !xml) throw new Error("tool-call smoke failed"); if(c.length && c[0]?.function?.name!=="probe") throw new Error("wrong native tool call"); console.log("[autobot] local model smoke and tool-call smoke passed");'; then
    echo '[autobot] first qwen3 tool-call smoke did not emit a call; retrying once with explicit thinking enabled.'
    curl -fsS --max-time 90 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d "{\"model\":\"$MODEL\",\"stream\":false,\"think\":true,\"tools\":[{\"type\":\"function\",\"function\":{\"name\":\"probe\",\"description\":\"Required readiness probe. Call this function to confirm tool use.\",\"parameters\":{\"type\":\"object\",\"properties\":{\"check\":{\"type\":\"string\",\"description\":\"Use the literal value READY\"}},\"required\":[\"check\"]}}}],\"options\":{\"temperature\":0,\"num_ctx\":4096,\"num_predict\":300},\"messages\":[{\"role\":\"user\",\"content\":\"Call probe exactly once. Do not provide a prose answer before or instead of the tool call.\"}]}" >/tmp/bikeztagram-ollama-tool-smoke-retry.json
    node --input-type=module -e 'import fs from "node:fs"; const t=JSON.parse(fs.readFileSync("/tmp/bikeztagram-ollama-tool-smoke-retry.json","utf8")); const c=t.message?.tool_calls||[]; const raw=String(t.message?.content||""); const xml=/<tool_call>\s*\{[\s\S]*?"name"\s*:\s*"probe"[\s\S]*?\}\s*<\/tool_call>/.test(raw); if(!c.length && !xml) throw new Error("native tool-call smoke failed after retry"); if(c.length && c[0]?.function?.name!=="probe") throw new Error("wrong native tool call after retry"); console.log("[autobot] local model smoke and tool-call retry passed");'
  fi
}
if ! validate_model; then
  echo "[autobot] local model failed readiness/tool-call smoke: $MODEL"
  cat /tmp/bikeztagram-ollama-tool-smoke.json || true
  cat /tmp/bikeztagram-ollama-tool-smoke-retry.json || true
  exit 1
fi
echo "LOCAL_AI_READY=1" >> "$GITHUB_ENV"
echo "OLLAMA_HOST=http://127.0.0.1:11434" >> "$GITHUB_ENV"
echo "LOCAL_AI_MODEL=$MODEL" >> "$GITHUB_ENV"
echo "[autobot] local AI brain ready: $MODEL; tool-call readiness verified."
