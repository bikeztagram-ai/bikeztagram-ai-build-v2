#!/usr/bin/env node
/** Canonical safety contract for the active fast structured-Qwen AutoBot runtime. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');
const fastBrain = read('builder/runner/repository-aware-fast-brain.mjs');
const fastExecutor = read('builder/runner/repository-aware-fast-executor.mjs');
const index = read('builder/runner/repository-index.mjs');
const deterministic = read('builder/runner/deterministic-executor.mjs');
const gate = read('scripts/autobot/run-production-gate.mjs');

if (/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow + fastBrain + fastExecutor)) failures.push('forbidden Gemini provider reference in active AutoBot runtime');
if (/gh\s+pr\s+merge|gh\s+pr\s+approve/i.test(workflow + fastBrain + fastExecutor)) failures.push('automatic merge/approval path detected');
if (/vercel\s+(deploy|promote)|vercel\.com\/api/i.test(workflow + fastBrain + fastExecutor)) failures.push('automatic production deployment path detected');
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
if (!workflow.includes('repository-aware-fast-brain.mjs')) failures.push('workflow does not include structured coding brain');
if (!fastExecutor.includes('repository-aware-fast-brain.mjs')) failures.push('fast executor does not invoke structured coding brain');
if (!fastBrain.includes('think: false')) failures.push('structured coding brain must disable thinking');
if (!fastBrain.includes('num_predict: 360')) failures.push('structured coding brain output ceiling missing');
if (!fastBrain.includes("run('npm', ['run', 'build'])")) failures.push('structured coding brain build verification missing');
if (!fastBrain.includes("['diff', '--', 'src', 'public']")) failures.push('structured coding brain product-source diff verification missing');
if (!fastBrain.includes('maxEdits')) failures.push('structured coding brain edit ceiling missing');
if (!fastBrain.includes('safe(file)')) failures.push('structured coding brain path safety missing');
if (!fastBrain.includes('search must match exactly once')) failures.push('structured coding brain exact-match protection missing');
if (!fastBrain.includes('restore(snapshots)')) failures.push('structured coding brain rollback protection missing');
if (!workflow.includes('verify:autobot-production-gate')) failures.push('workflow lacks authoritative production gate');
if (!workflow.includes('Require a real product-source change')) failures.push('workflow lacks product-source success gate');
if (!workflow.includes("grep -E '^(src|public)/'")) failures.push('product-source gate must include src and public');

if (/git.*reset.*--hard|git.*clean\s+-f/.test(fastBrain + fastExecutor)) failures.push('fast runtime contains unsafe wholesale rollback');
if (!index.includes('git') || !index.includes('dependencyEdges') || !index.includes('sensitive')) failures.push('repository index lacks source/dependency/secret protections');
if (!deterministic.includes('allowedTask')) failures.push('deterministic executor lacks protected-path guard');
if (!gate.includes('verify:generation-capability-contract') || !gate.includes('verify:autobot-audit-tamper')) failures.push('authoritative production gate is incomplete');

if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot canonical safety contract PASS: fast structured Qwen brain, bounded edits, scoped exact-match writes, rollback/build/diff verification, dependency-safe deterministic work, no Gemini, and no automatic merge/deploy.');
