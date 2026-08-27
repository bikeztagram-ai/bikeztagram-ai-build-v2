#!/usr/bin/env node
/** Run the deterministic builder repeatedly within one shared unit/time budget. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checkpoint = path.join(root, 'builder', 'working', 'deterministic-autobot.json');
const requestedMinutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '360', 10);
const requestedUnits = Number.parseInt(process.env.BUILDER_MAX_UNITS || '100', 10);
const started = Date.now();
const completedKeys = new Set();
const completedObjectives = new Set();
let totalUnits = 0;
let iteration = 0;

function readState() {
  try { return JSON.parse(fs.readFileSync(checkpoint, 'utf8')); }
  catch { return null; }
}
function remainingMinutes() { return Math.max(0, requestedMinutes - ((Date.now() - started) / 60000)); }
function runOnce(minutes, units) {
  const env = {
    ...process.env,
    BUILDER_MAX_MINUTES: String(Math.max(1, Math.ceil(minutes))),
    BUILDER_MAX_UNITS: String(Math.max(1, units)),
    BUILDER_COMPLETED_OBJECTIVES: [...completedObjectives].join(',')
  };
  console.log(`[autobot] sustained iteration ${iteration}: ${units} new units / ${minutes.toFixed(2)} minutes remaining; completed objectives=${[...completedObjectives].join(',') || 'none'}`);
  return spawnSync(process.execPath, ['builder/runner/deterministic-executor.mjs'], { cwd: root, stdio: 'inherit', env }).status ?? 1;
}

// Seed the in-run objective handoff from durable checkpoint state. This is
// critical after a successful prior run: the roadmap may still describe the
// objective as queued because roadmap mutation requires human review/merge,
// while the checkpoint already proves that its implementation units passed.
const initial = readState();
if (initial?.status === 'objective-complete' && initial.objectiveId) {
  completedObjectives.add(initial.objectiveId);
}

while (totalUnits < requestedUnits && remainingMinutes() > 0) {
  iteration += 1;
  const status = runOnce(remainingMinutes(), requestedUnits - totalUnits);
  const state = readState();
  if (status !== 0) process.exit(status);

  if (state?.objectiveId) {
    for (const taskId of state.completed || []) completedKeys.add(`${state.objectiveId}:${taskId}`);
    if (state.status === 'objective-complete') completedObjectives.add(state.objectiveId);
  }
  totalUnits = Math.min(requestedUnits, completedKeys.size);

  if (state?.status === 'idle') {
    console.log('[autobot] No eligible unfinished roadmap units remain; stopping safely.');
    break;
  }
  if (state?.status === 'blocked') {
    console.error(`[autobot] Blocked: ${state.error || 'unknown reason'}`);
    process.exit(2);
  }
  if (state?.status !== 'objective-complete' && state?.status !== 'checkpointed') break;
}

console.log(`[autobot] Sustained run finished: ${totalUnits}/${requestedUnits} new verified units; ${((Date.now() - started) / 60000).toFixed(2)} minutes elapsed; objectives completed=${[...completedObjectives].join(',') || 'none'}.`);
