#!/usr/bin/env node
/**
 * Canonical contract for the active repository-aware Qwen agent runtime.
 * Keep this validator focused on architecture and safety; deterministic and
 * dependency validators cover their own orthogonal concerns.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const brain = read('builder/runner/repository-aware-feature-brain.mjs');
const executor = read('builder/runner/repository-aware-fast-executor.mjs');
const indexer = read('builder/runner/repository-index.mjs');
const proxy = read('builder/runner/ollama-performance-proxy.mjs');
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');

const required = [
  ['repository-aware-agent-v7', 'canonical Qwen agent protocol marker missing'],
  ['/api/chat', 'Qwen agent must use Ollama chat'],
  ['stream: false', 'Qwen agent must use non-streaming responses'],
  ['think: false', 'Qwen agent must disable thinking'],
  ['temperature: 0', 'Qwen agent must use deterministic temperature'],
  ['num_ctx: 4096', 'Qwen agent must retain the proven 4K model context'],
  ['num_predict: 900', 'Qwen agent must retain the proven output budget'],
  ['function parseToolCalls', 'native/fallback tool-call parsing missing'],
  ['read_file', 'objective-scoped read tool missing'],
  ['edit_file', 'objective-scoped edit tool missing'],
  ['run_check', 'bounded verification tool missing'],
  ['submit', 'verified submission tool missing'],
  ['maxTurns', 'bounded agent-turn budget missing'],
  ['maxEdits', 'bounded edit budget missing'],
  ['isSafeRepoFile', 'indexed repository/path safety missing'],
  ['must match once', 'exact-match write protection missing'],
  ['snapshots', 'rollback snapshots missing'],
  ['npm', 'build verification missing'],
  ['diff-check', 'diff verification missing'],
  ['changed-syntax', 'changed-source syntax verification missing'],
  ['dependenciesMet', 'dependency-aware objective selection missing'],
  ['appendAudit', 'agent audit logging missing'],
  ['preview: content.slice(0, 650)', 'objective context must remain compact'],
  ['slice(0, 4800)', 'tool read results must remain compact'],
  ['tool_name: call.name', 'Ollama tool results must identify their originating tool'],
  ['Inspection complete', 'agent must explicitly transition from inspection to editing'],
  ['no usable tool call returned', 'agent must log and recover from non-tool responses'],
];

for (const [needle, message] of required) if (!brain.includes(needle)) failures.push(message);

if (!/Math\.min\(180,\s*Math\.max\(45,\s*Math\.floor\(left\(\) \* 60\)\)\)/.test(brain)) {
  failures.push('Qwen request timeout must be bounded at 180 seconds while respecting remaining feature time');
}
if (!/tools\s*=\s*\[/.test(brain)) failures.push('Qwen tool surface is missing');
if (!executor.includes('AUTOBOT_AGENT_TURNS') || !executor.includes('AUTOBOT_FEATURE_MAX_EDITS')) {
  failures.push('fast executor must pass bounded Qwen agent budgets');
}
if (!executor.includes('repository-aware-feature-brain.mjs')) failures.push('fast executor must invoke the proven repository-aware Qwen agent');
if (executor.includes('repository-aware-fast-brain.mjs')) failures.push('fast executor must not use the retired single-shot structured brain');
if (!executor.includes('repository-index.mjs')) failures.push('fast executor must refresh the repository index');
if (!/Math\.min\(10,\s*Math\.floor\(left\(\)\)/.test(executor)) failures.push('Qwen feature slice must allow the fuller bounded time window');
if (/git\s+reset\s+--hard|git\s+clean\s+-f/.test(brain + executor)) failures.push('Qwen runtime must never wholesale reset or clean the working tree');

if (!indexer.includes('ls-files') || !indexer.includes('dependencyEdges') || !indexer.includes('sensitive')) {
  failures.push('repository index must be Git-derived, dependency-aware and secret-safe');
}
if (!proxy.includes('request.stream = false') || !proxy.includes('request.think = false') || !proxy.includes('temperature: 0')) {
  failures.push('performance proxy must enforce non-streaming, no-thinking and deterministic temperature');
}
if (!workflow.includes('workflow_dispatch:')) failures.push('canonical workflow must be dispatchable');
if (!workflow.includes('repository-aware-fast-executor.mjs')) failures.push('canonical workflow must invoke fast executor');
if (!workflow.includes('repository-aware-feature-brain.mjs')) failures.push('canonical workflow must validate the active Qwen agent');
if (!workflow.includes('AUTOBOT_AGENT_TURNS=8')) failures.push('canonical workflow must restore the proven eight-turn agent budget');
if (!workflow.includes('AUTOBOT_FEATURE_MAX_EDITS=3')) failures.push('canonical workflow must restore the proven three-edit feature budget');
if (!workflow.includes('LOCAL_AI_PROXY_NUM_CTX=8192')) failures.push('canonical workflow must restore the proven proxy context ceiling');
if (!workflow.includes('LOCAL_AI_PROXY_NUM_PREDICT=650')) failures.push('canonical workflow must restore the proven proxy output ceiling');
if (!workflow.includes('LOCAL_AI_PROXY_THINK=false')) failures.push('proxy must explicitly disable thinking');
if (workflow.includes('repository-aware-fast-brain.mjs')) failures.push('workflow must not treat the retired single-shot structured brain as canonical');

try {
  execFileSync(process.execPath, ['builder/runner/repository-index.mjs'], { cwd: root, stdio: 'ignore' });
} catch {
  failures.push('repository index failed during contract verification');
}

const mapPath = path.join(root, 'builder/working/repository-map.json');
if (!fs.existsSync(mapPath)) failures.push('repository map missing after refresh');
if (fs.existsSync(mapPath)) {
  try {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    if (map.version !== 1 || !Array.isArray(map.files) || !map.byPath || !Array.isArray(map.dependencyEdges)) {
      failures.push('repository map schema invalid');
    }
    if (!map.files.length) failures.push('repository map contains no files');
  } catch {
    failures.push('repository map is invalid JSON');
  }
}

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('AutoBot safety contract v3 PASS: canonical repository-aware Qwen agent, compact edit progression, bounded tool turns, scoped writes, rollback, verification, dependency-aware index and protected checkpoint runtime present.');
