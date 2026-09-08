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
  ['progress[objective.id] = 1', 'submit completion tracking'],
  ['failedEditFiles', 'failed-file strategy state'],
  ['same file is blocked for this attempt', 'failed-file guard'],
  ['A previous edit failed. Do not retry that file.', 'inspection strategy steering'],
  ['Do NOT retry the same replacement.', 'failed-edit feedback steering'],
]) requireMarker(active.includes(marker), `active brain missing ${message}`);

requireMarker(hardener.includes('canonical feature brain recovery contract incomplete'), 'runtime hardener does not validate the canonical recovery contract');
requireMarker(hardener.includes('Do NOT retry the same replacement.'), 'runtime hardener does not validate the canonical failed-edit steering');
requireMarker(hardener.includes('export-contract-check.mjs'), 'runtime hardener does not contain the export migration');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bikeztagram-fast-brain-'));
try {
  fs.mkdirSync(path.join(temp, 'builder/runner'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'builder/brain'), { recursive: true });
  fs.copyFileSync(brainPath, path.join(temp, 'builder/runner/repository-aware-feature-brain.mjs'));
  fs.copyFileSync(path.join(root, 'builder/brain/task-library.json'), path.join(temp, 'builder/brain/task-library.json'));
  const result = spawnSync(process.execPath, [hardenerPath], {
    cwd: temp,
    encoding: 'utf8',
    env: { ...process.env, AUTOBOT_HARDENING_ROOT: temp },
  });
  requireMarker(result.status === 0, `runtime hardener actual-source fixture failed: ${result.stderr || result.stdout}`);
  const hardened = fs.readFileSync(path.join(temp, 'builder/runner/repository-aware-feature-brain.mjs'), 'utf8');
  requireMarker(hardened === active, 'runtime hardener unexpectedly rewrote canonical brain source');
  requireMarker(hardened.includes('edit rejected and rolled back'), 'fixture lost transactional rollback');
  requireMarker(hardened.includes('failedEditFiles'), 'fixture lost failed-file recovery');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error('[autobot] fast-brain rollback regression FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] fast-brain rollback regression PASS: canonical brain is transactional and hardening is idempotent.');
