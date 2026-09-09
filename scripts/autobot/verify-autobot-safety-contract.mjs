#!/usr/bin/env node
/** Canonical safety contract for the active repository-aware Qwen AutoBot runtime. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');
const brain = read('builder/runner/repository-aware-feature-brain.mjs');
const executor = read('builder/runner/repository-aware-fast-executor.mjs');
const index = read('builder/runner/repository-index.mjs');
const deterministic = read('builder/runner/deterministic-executor.mjs');
const gate = read('scripts/autobot/run-production-gate.mjs');

if (/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow + brain + executor)) failures.push('forbidden Gemini provider reference in active AutoBot runtime');
if (/gh\s+pr\s+merge|gh\s+pr\s+approve/i.test(workflow + brain + executor)) failures.push('automatic merge/approval path detected');
if (/vercel\s+(deploy|promote)|vercel\.com\/api/i.test(workflow + brain + executor)) failures.push('automatic production deployment path detected');
if (!workflow.includes('workflow_dispatch:')) failures.push('canonical fast workflow must be manually dispatchable');
if (!workflow.includes('cancel-in-progress: false')) failures.push('fast workflow must preserve queued runs');
if (!workflow.includes('qwen3:4b')) failures.push('fast workflow must use Qwen3 4B-compatible model');
if (!workflow.includes('LOCAL_AI_MODEL')) failures.push('fast workflow lacks explicit local model input');
if (!workflow.includes('actions/cache@v4')) failures.push('local model cache missing');

const numericSetting = (key) => {
  const match = workflow.match(new RegExp(`${key}[^\\n]*?(?:=|:)\\s*[\\\"']?(\\d+)`, 'm'));
  return match ? Number(match[1]) : null;
};
const edits = numericSetting('AUTOBOT_FEATURE_MAX_EDITS');
const timeout = numericSetting('LOCAL_AI_FEATURE_TIMEOUT_SECONDS');
if (edits == null || edits < 1 || edits > 3) failures.push('fast workflow edit ceiling missing or unsafe');
if (timeout == null || timeout < 120 || timeout > 300) failures.push('fast workflow feature timeout must be 120-300 seconds');

if (!workflow.includes('repository-aware-fast-executor.mjs')) failures.push('workflow does not invoke fast sustained executor');
if (!workflow.includes('repository-aware-feature-brain.mjs')) failures.push('workflow does not validate the active Qwen agent');
if (!executor.includes('repository-aware-feature-brain.mjs')) failures.push('fast executor does not invoke the active repository-aware Qwen agent');
if (executor.includes('repository-aware-fast-brain.mjs')) failures.push('fast executor still invokes the retired single-shot structured brain');
if (!brain.includes('repository-aware-agent-v7')) failures.push('repository-aware Qwen agent protocol missing');
if (!brain.includes('/api/chat')) failures.push('Qwen agent must use Ollama chat');
if (!brain.includes('think: false')) failures.push('Qwen agent must disable thinking');
if (!brain.includes('num_ctx: 4096')) failures.push('Qwen agent context contract missing');
if (!brain.includes('num_predict: 900')) failures.push('Qwen agent output contract missing');
if (!brain.includes('function parseToolCalls')) failures.push('Qwen tool-call parser missing');
for (const tool of ['read_file','edit_file','run_check','submit']) if (!brain.includes(tool)) failures.push(`Qwen ${tool} tool missing`);
if (!brain.includes('maxTurns') || !brain.includes('maxEdits')) failures.push('bounded Qwen turn/edit budgets missing');
if (!brain.includes('isSafeRepoFile')) failures.push('repository/path safety missing');
if (!brain.includes('must match once')) failures.push('exact-match write protection missing');
if (!brain.includes('snapshots')) failures.push('rollback snapshots missing');
if (!brain.includes('diff-check') || !brain.includes('changed-syntax')) failures.push('post-edit verification missing');
if (!brain.includes('appendAudit')) failures.push('agent audit logging missing');

if (!workflow.includes('AUTOBOT_AGENT_TURNS=8')) failures.push('workflow must restore eight Qwen agent turns');
if (!workflow.includes('AUTOBOT_FEATURE_MAX_EDITS=3')) failures.push('workflow must restore three Qwen edits');
if (!workflow.includes('LOCAL_AI_PROXY_NUM_CTX=8192')) failures.push('workflow must restore 8192 proxy context');
if (!workflow.includes('LOCAL_AI_PROXY_NUM_PREDICT=650')) failures.push('workflow must restore 650 proxy output ceiling');
if (!workflow.includes('LOCAL_AI_PROXY_THINK=false')) failures.push('workflow must explicitly disable thinking');
if (!index.includes('ls-files') || !index.includes('dependencyEdges') || !index.includes('sensitive')) failures.push('repository index must be Git-derived, dependency-aware and secret-safe');
if (!deterministic.includes('allowedTask')) failures.push('deterministic executor lacks protected-path guard');
if (!gate.includes('verify:generation-capability-contract') || !gate.includes('verify:autobot-audit-tamper')) failures.push('authoritative production gate is incomplete');
if (!workflow.includes('verify:autobot-production-gate')) failures.push('workflow lacks authoritative production gate');
if (!workflow.includes('Require a real product-source change')) failures.push('workflow lacks product-source success gate');
if (!workflow.includes("grep -E '^(src|public)/'")) failures.push('product-source gate must include src and public');

if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot safety contract PASS: active repository-aware Qwen agent, bounded tool turns, scoped writes, rollback/verification, dependency-safe index, no Gemini, and no automatic merge/deploy.');
