#!/usr/bin/env node
/** Regression test for the active canonical Qwen runtime recovery contract. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const hardenerPath = path.join(root, 'scripts/autobot/fast-brain-runtime-hardening.mjs');
const hardener = fs.readFileSync(hardenerPath, 'utf8');
const active = fs.readFileSync(brainPath, 'utf8');
const failures = [];
const requireMarker = (condition, message) => { if (!condition) failures.push(message); };

for (const [marker, message] of [
  ['fs.writeFileSync(abs(file), next);', 'active brain edit path'],
  ['const syntax = syntaxCheck(file);', 'active brain syntax check'],
  ['edit rejected and rolled back', 'transactional rollback'],
  ['fs.writeFileSync(abs(file), current);', 'exact pre-edit restoration'],
  ['completed: completedIds', 'durable completion state'],
  ['failedEditFiles', 'failed-file strategy state'],
  ['same file is blocked for this attempt', 'failed-file guard'],
  ['A previous edit failed. Do not retry that file.', 'inspection strategy steering'],
  ['Do NOT retry the same replacement.', 'failed-edit feedback steering'],
]) requireMarker(active.includes(marker), `active brain missing ${message}`);

requireMarker(/progress\[objective\.id\]\s*=\s*(?:Math\.max\([^\n]*\)|1)/.test(active), 'submit completion tracking');
requireMarker(/completedIds/.test(active) && /saveState\(\)/.test(active), 'durable state persistence');
requireMarker(/function modelCall\(messages(?:,\s*(?:readToolEnabled\s*=\s*true|toolPhase\s*=\s*'inspect'))?\)/.test(active) && /\/api\/chat/.test(active), 'canonical model-call path');
requireMarker(/maxTurns/.test(active) && /maxEdits/.test(active), 'bounded agent ceilings');

requireMarker(hardener.includes('canonical feature brain recovery contract incomplete'), 'runtime hardener does not validate the canonical recovery contract');
requireMarker(hardener.includes('Do NOT retry the same replacement.'), 'runtime hardener does not validate the canonical failed-edit steering');
requireMarker(hardener.includes('export-contract-check.mjs'), 'runtime hardener does not contain the export migration');
requireMarker(hardener.includes('modelCallPattern'), 'runtime hardener is not idempotent for the modelCall migration');
requireMarker(hardener.includes('const allowedByPhase ='), 'runtime hardener does not enforce strict tool phases');
requireMarker(hardener.includes('parsedCalls.slice(0, 1)'), 'runtime hardener does not enforce one tool call per turn');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bikeztagram-fast-brain-'));
try {
  fs.mkdirSync(path.join(temp, 'builder/runner'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'builder/brain'), { recursive: true });
  fs.copyFileSync(brainPath, path.join(temp, 'builder/runner/repository-aware-feature-brain.mjs'));
  fs.copyFileSync(path.join(root, 'builder/brain/task-library.json'), path.join(temp, 'builder/brain/task-library.json'));
  const hardenEnv = { ...process.env, AUTOBOT_HARDENING_ROOT: temp };
  const first = spawnSync(process.execPath, [hardenerPath], { cwd: temp, encoding: 'utf8', env: hardenEnv });
  requireMarker(first.status === 0, `runtime hardener actual-source fixture failed: ${first.stderr || first.stdout}`);
  const second = spawnSync(process.execPath, [hardenerPath], { cwd: temp, encoding: 'utf8', env: hardenEnv });
  requireMarker(second.status === 0, `runtime hardener second-pass idempotency failed: ${second.stderr || second.stdout}`);
  const hardened = fs.readFileSync(path.join(temp, 'builder/runner/repository-aware-feature-brain.mjs'), 'utf8');
  requireMarker(hardened.includes('edit rejected and rolled back'), 'fixture lost transactional rollback');
  requireMarker(hardened.includes('failedEditFiles'), 'fixture lost failed-file recovery');
  requireMarker(/progress\[objective\.id\]\s*=\s*(?:Math\.max\([^\n]*\)|1)/.test(hardened), 'fixture lost durable completion tracking');
  requireMarker(hardened.includes("const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');"), 'fixture lost real syntax validator');
  requireMarker(hardened.includes('const allowedByPhase ='), 'fixture lost strict tool-phase controller');
  requireMarker(hardened.includes("toolPhase = 'inspect'"), 'fixture lost inspection phase');
  requireMarker(hardened.includes("toolPhase = 'edit'"), 'fixture lost edit phase');
  requireMarker(hardened.includes("toolPhase = 'verify'"), 'fixture lost verification phase');
  requireMarker(/allowedByPhase\.submit|\bsubmit:\s*new Set\(\['submit'\]\)|toolPhase\s*=\s*result === 'PASS' \? 'submit' : (?:edit|inspect)/.test(hardened), 'fixture lost submit phase');
  requireMarker(hardened.includes('parsedCalls.slice(0, 1)'), 'fixture lost one-tool-per-turn guard');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error('[autobot] fast-brain rollback regression FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] fast-brain rollback regression PASS: canonical brain recovery, durable progress, failed-edit steering, strict tool phases, one-tool-per-turn enforcement, and idempotent hardening contract verified.');