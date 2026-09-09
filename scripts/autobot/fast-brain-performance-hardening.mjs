#!/usr/bin/env node
/**
 * Runtime performance hardening for the canonical Qwen3 4B feature brain.
 * Reduces per-call latency and context pressure without changing the model,
 * product gates, rollback behaviour, or verification contracts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const runtimePath = path.join(root, 'scripts/autobot/fast-brain-runtime-hardening.mjs');
const originalBrain = fs.readFileSync(brainPath, 'utf8');
const originalRuntime = fs.readFileSync(runtimePath, 'utf8');
let brain = originalBrain;
let runtime = originalRuntime;

const timeoutOld = "const seconds = Math.min(180, Math.max(45, Math.floor(left() * 60)));";
const timeoutNew = "const seconds = Math.min(90, Math.max(30, Math.floor(left() * 60)));";
if (brain.includes(timeoutOld)) brain = brain.replace(timeoutOld, timeoutNew);
else if (!brain.includes(timeoutNew)) throw new Error('model timeout contract not found; refusing performance migration');

const optionsOld = "options: { temperature: 0, num_ctx: 4096, num_predict: 900 }";
const optionsNew = "options: { temperature: 0, num_ctx: 3072, num_predict: 420 }";
if (brain.includes(optionsOld)) brain = brain.replace(optionsOld, optionsNew);
else if (!brain.includes(optionsNew)) throw new Error('model generation options not found; refusing performance migration');

const turnOld = "const maxTurns = Math.min(10, Math.max(4, Number(process.env.AUTOBOT_AGENT_TURNS || 8)));";
const turnNew = "const maxTurns = Math.min(10, Math.max(4, Number(process.env.AUTOBOT_AGENT_TURNS || 10)));";
if (brain.includes(turnOld)) brain = brain.replace(turnOld, turnNew);
else if (!brain.includes(turnNew)) throw new Error('agent turn contract not found; refusing performance migration');

const modeRequiredOld = "required: ['file', 'search', 'replace'], properties: { file: { type: 'string' }, mode:";
const modeRequiredNew = "required: ['file', 'mode', 'search', 'replace'], properties: { file: { type: 'string' }, mode:";
if (brain.includes(modeRequiredOld)) brain = brain.replace(modeRequiredOld, modeRequiredNew);
else if (!brain.includes(modeRequiredNew)) throw new Error('edit mode contract not found; refusing explicit-mode migration');

const promptOld = 'First inspect one supplied file with read_file. Then STOP INSPECTING and call edit_file with one precise, meaningful improvement.';
const promptNew = 'First inspect one supplied file with read_file. Then STOP INSPECTING and immediately call edit_file with one precise, meaningful improvement. Keep the edit small so the tool call is fast.';
if (brain.includes(promptOld)) brain = brain.replace(promptOld, promptNew);
else if (!brain.includes(promptNew)) throw new Error('execution prompt not found; refusing performance migration');

// The runtime hardener runs before this pass and is also used by the rollback
// regression. Keep its canonical recovery markers and generated modelCall
// aligned with the same performance contract, otherwise regression would
// reject the intentionally compact model settings before Qwen can run.
const runtimeMarkerOld = "'num_ctx: 4096', 'num_predict: 900',";
const runtimeMarkerNew = "'num_ctx: 3072', 'num_predict: 420',";
if (runtime.includes(runtimeMarkerOld)) runtime = runtime.replace(runtimeMarkerOld, runtimeMarkerNew);
else if (!runtime.includes(runtimeMarkerNew)) throw new Error('runtime hardening model markers are not recognized; refusing performance migration');
if (runtime.includes(optionsOld)) runtime = runtime.replace(optionsOld, optionsNew);
else if (!runtime.includes(optionsNew)) throw new Error('runtime hardening model generation settings are not recognized; refusing performance migration');

for (const marker of [
  "const seconds = Math.min(90, Math.max(30, Math.floor(left() * 60)));",
  "options: { temperature: 0, num_ctx: 3072, num_predict: 420 }",
  "const maxTurns = Math.min(10, Math.max(4, Number(process.env.AUTOBOT_AGENT_TURNS || 10)));",
  "required: ['file', 'mode', 'search', 'replace']",
  'Keep the edit small so the tool call is fast.'
]) if (!brain.includes(marker)) throw new Error(`performance marker missing: ${marker}`);
for (const marker of [
  "'num_ctx: 3072', 'num_predict: 420',",
  "options: { temperature: 0, num_ctx: 3072, num_predict: 420 }"
]) if (!runtime.includes(marker)) throw new Error(`runtime performance marker missing: ${marker}`);

fs.writeFileSync(brainPath, brain);
fs.writeFileSync(runtimePath, runtime);
try {
  execFileSync(process.execPath, ['--check', brainPath], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  execFileSync(process.execPath, ['--check', runtimePath], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
  fs.writeFileSync(brainPath, originalBrain);
  fs.writeFileSync(runtimePath, originalRuntime);
  throw new Error(`performance hardening syntax validation failed; restored both files: ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(0, 3000)}`);
}
console.log('[autobot] Qwen performance PASS: bounded 90s model calls, compact 3072 context, 420-token generation budget, up to 10 bounded turns, explicit edit mode, fast small-edit guidance, and aligned runtime recovery markers installed.');
