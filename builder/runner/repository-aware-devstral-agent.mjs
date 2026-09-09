#!/usr/bin/env node
/**
 * Experimental Devstral adapter for the repository-aware Fast Brain.
 *
 * The isolated Devstral copy is created from the hardened canonical feature
 * brain so the experimental path retains the proven safety/edit machinery.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const source = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const model = process.env.LOCAL_AI_MODEL || 'devstral:24b';
const expected = 'devstral:24b';
const canonicalModel = 'qwen3:4b-instruct-2507-q4_K_M';

if (model !== expected) {
  console.error(`[autobot] Devstral adapter refusing model drift: ${model}`);
  process.exit(2);
}

const original = fs.readFileSync(source, 'utf8');
if (!original.includes(canonicalModel)) {
  console.error('[autobot] Devstral adapter could not find the canonical model marker.');
  process.exit(2);
}

const temp = path.join(os.tmpdir(), `bikeztagram-devstral-feature-brain-${process.pid}.mjs`);
const isolated = original
  .replaceAll(canonicalModel, expected)
  .replaceAll('Qwen', 'Devstral')
  .replaceAll('qwen', 'devstral');
if (isolated === original || !isolated.includes(expected) || /qwen/i.test(isolated)) {
  console.error('[autobot] Devstral adapter failed to create a model-clean isolated variant.');
  process.exit(2);
}

fs.writeFileSync(temp, isolated);
try {
  const result = spawnSync(process.execPath, [temp], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, LOCAL_AI_MODEL: expected },
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
} finally {
  try { fs.rmSync(temp, { force: true }); } catch {}
}
