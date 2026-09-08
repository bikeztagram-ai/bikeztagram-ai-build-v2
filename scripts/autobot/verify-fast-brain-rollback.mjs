#!/usr/bin/env node
/** Regression test for the active Qwen runtime hardener. */
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

requireMarker(active.includes('fs.writeFileSync(abs(file), next);'), 'active brain edit path missing');
requireMarker(active.includes('const syntax = syntaxCheck(file);'), 'active brain syntax check missing');
requireMarker(hardener.includes('edit rejected and rolled back'), 'runtime hardener missing transactional rollback');
requireMarker(hardener.includes('completed: completedIds'), 'runtime hardener missing durable completed-objective state');
requireMarker(hardener.includes('progress[objective.id] = 1'), 'runtime hardener missing submit completion tracking');
requireMarker(hardener.includes('(progress[o.id] || 0) < 1'), 'runtime hardener missing completed-objective exclusion');
requireMarker(hardener.includes('failedEditFiles'), 'runtime hardener missing failed-file strategy state');
requireMarker(hardener.includes('const requestedEnd = Number(end) || 0;'), 'runtime hardener missing minimum inspection window');
requireMarker(hardener.includes('Do NOT repeat the same replacement.'), 'runtime hardener missing failed-edit feedback steering');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bikeztagram-fast-brain-'));
try {
  fs.mkdirSync(path.join(temp, 'builder/runner'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'builder/brain'), { recursive: true });
  // Use the actual active brain as the fixture. This prevents the regression test
  // from drifting away from the exact source that the runtime hardener patches.
  fs.copyFileSync(brainPath, path.join(temp, 'builder/runner/repository-aware-feature-brain.mjs'));
  fs.copyFileSync(path.join(root, 'builder/brain/task-library.json'), path.join(temp, 'builder/brain/task-library.json'));
  const result = spawnSync(process.execPath, [hardenerPath], {
    cwd: temp,
    encoding: 'utf8',
    env: { ...process.env, AUTOBOT_HARDENING_ROOT: temp },
  });
  requireMarker(result.status === 0, `runtime hardener actual-source fixture failed: ${result.stderr || result.stdout}`);
  const hardened = fs.readFileSync(path.join(temp, 'builder/runner/repository-aware-feature-brain.mjs'), 'utf8');
  for (const [marker, message] of [
    ['edit rejected and rolled back', 'transactional rollback'],
    ['completed: completedIds', 'durable completion state'],
    ['progress[objective.id] = 1', 'submit completion tracking'],
    ['(progress[o.id] || 0) < 1', 'completed-objective exclusion'],
    ['const requestedEnd = Number(end) || 0;', 'minimum inspection window'],
    ['failedEditFiles', 'failed-file strategy state'],
    ['same file is blocked for this attempt', 'failed-file guard'],
    ['Do NOT repeat the same replacement.', 'failed-edit feedback steering'],
  ]) requireMarker(hardened.includes(marker), `actual-source hardening did not install ${message}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error('[autobot] fast-brain rollback regression FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] fast-brain rollback regression PASS');
