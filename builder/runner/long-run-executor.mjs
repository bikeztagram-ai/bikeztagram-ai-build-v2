#!/usr/bin/env node
/** Run the same deterministic builder repeatedly within one shared unit/time budget. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checkpoint = path.join(root, 'builder', 'working', 'deterministic-autobot.json');
const requestedMinutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '360', 10);
const requestedUnits = Number.parseInt(process.env.BUILDER_MAX_UNITS || '1000', 10);
const started = Date.now();
let totalUnits = 0;
let iteration = 0;
const completedObjectives = new Set();

function readState() { try { return JSON.parse(fs.readFileSync(checkpoint, 'utf8')); } catch { return null; } }
function seedFromCheckpoint() {
  const state = readState();
  if (!state) return;
  if (state.history?.objectives) for (const objectiveId of state.history.objectives) completedObjectives.add(objectiveId);
  if (state.objectiveId && state.status === 'objective-complete') completedObjectives.add(state.objectiveId);
  console.log(`[autobot] seeded checkpoint: durable objectives=${[...completedObjectives].join(',') || 'none'}`);
}
function remainingMinutes() { return Math.max(0, requestedMinutes - ((Date.now() - started) / 60000)); }
function runOnce(minutes, units) {
  const env = {
    ...process.env,
    BUILDER_MAX_MINUTES: String(Math.max(1, Math.ceil(minutes))),
    BUILDER_MAX_UNITS: String(Math.max(1, units)),
    BUILDER_COMPLETED_OBJECTIVES: [...completedObjectives].join(',')
  };
  console.log(`[autobot] sustained iteration ${iteration}: ${units} remaining unit allowance / ${minutes.toFixed(2)} minutes remaining; completed objectives=${[...completedObjectives].join(',') || 'none'}`);
  const result = spawnSync(process.execPath, ['builder/runner/deterministic-executor.mjs'], { cwd: root, stdio: 'inherit', env });
  if (result.error) { console.error(`[autobot] deterministic executor failed to start: ${result.error.message}`); return 1; }
  return result.status ?? 1;
}

seedFromCheckpoint();
while (totalUnits < requestedUnits && remainingMinutes() > 0) {
  iteration += 1;
  const status = runOnce(remainingMinutes(), requestedUnits - totalUnits);
  const state = readState();
  if (status !== 0) process.exit(status);
  const verifiedThisRun = Array.isArray(state?.verifiedThisRun) ? state.verifiedThisRun : [];
  totalUnits += verifiedThisRun.length;
  if (state?.history?.objectives) for (const objectiveId of state.history.objectives) completedObjectives.add(objectiveId);
  if (state?.status === 'idle') { console.log('[autobot] No eligible unfinished roadmap units remain; stopping safely.'); break; }
  if (state?.status === 'blocked') { console.error(`[autobot] Blocked: ${state.error || 'unknown reason'}`); process.exit(2); }
  if (verifiedThisRun.length === 0) { console.error('[autobot] No new verified units were produced; stopping to prevent a false sustained loop.'); break; }
  if (state?.status !== 'objective-complete' && state?.status !== 'checkpointed') break;
}
console.log(`[autobot] Sustained run finished: ${totalUnits}/${requestedUnits} new verified units; ${((Date.now() - started) / 60000).toFixed(2)} minutes elapsed; objectives completed=${[...completedObjectives].join(',') || 'none'}.`);
