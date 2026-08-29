#!/usr/bin/env node
/** Run deterministic work first, then hand the remaining budget to Bikeztagram's local AI brain. */
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
let replenishments = 0;
const maxReplenishments = Number.parseInt(process.env.AUTOBOT_MAX_GENERATED_WAVES || '3', 10);
const completedObjectives = new Set();
let localBrainStarted = false;

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
  const env = { ...process.env, BUILDER_MAX_MINUTES: String(Math.max(1, Math.ceil(minutes))), BUILDER_MAX_UNITS: String(Math.max(1, units)), BUILDER_COMPLETED_OBJECTIVES: [...completedObjectives].join(',') };
  console.log(`[autobot] sustained deterministic iteration ${iteration}: ${units} remaining units / ${minutes.toFixed(2)} minutes; completed=${[...completedObjectives].join(',') || 'none'}`);
  const result = spawnSync(process.execPath, ['builder/runner/deterministic-executor.mjs'], { cwd: root, stdio: 'inherit', env });
  if (result.error) { console.error(`[autobot] deterministic executor failed to start: ${result.error.message}`); return 1; }
  return result.status ?? 1;
}
function replenishBacklog() {
  if (replenishments >= maxReplenishments) { console.log(`[autobot] replenishment cap ${maxReplenishments} reached; handing control to local AI.`); return false; }
  const env = { ...process.env, AUTOBOT_MAX_GENERATED_WAVES: String(maxReplenishments) };
  const result = spawnSync(process.execPath, ['scripts/autobot/replenish-production-backlog.mjs'], { cwd: root, stdio: 'inherit', env });
  if (result.error || result.status !== 0) { console.error('[autobot] bounded backlog replenishment failed; handing control to local AI.'); return false; }
  replenishments += 1;
  return true;
}
function runLocalBrain() {
  if (localBrainStarted || remainingMinutes() <= 1) return 0;
  localBrainStarted = true;
  const minutes = Math.max(1, Math.floor(remainingMinutes()));
  console.log(`[autobot] deterministic roadmap is exhausted; starting Bikeztagram local AI brain with ${minutes} minutes remaining.`);
  const env = { ...process.env, BUILDER_MAX_MINUTES: String(minutes), LOCAL_AI_MODEL: process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:1.5b-instruct', AUTOBOT_LOCAL_PASSES: process.env.AUTOBOT_LOCAL_PASSES || '1000' };
  const result = spawnSync(process.execPath, ['builder/runner/local-brain.mjs'], { cwd: root, stdio: 'inherit', env });
  if (result.error) { console.error(`[autobot] local AI brain failed to start: ${result.error.message}`); return 1; }
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

  if (state?.status === 'blocked') { console.error(`[autobot] Blocked: ${state.error || 'unknown reason'}`); process.exit(2); }

  if (state?.status === 'idle' || state?.status === 'objective-complete') {
    if (remainingMinutes() <= 1) break;
    if (state?.status === 'idle' && totalUnits < requestedUnits && replenishBacklog()) continue;
    const localStatus = runLocalBrain();
    if (localStatus !== 0) process.exit(localStatus);
    break;
  }

  if (verifiedThisRun.length === 0) {
    console.log('[autobot] Deterministic executor produced no new verified units; handing remaining budget to local AI instead of stopping.');
    const localStatus = runLocalBrain();
    if (localStatus !== 0) process.exit(localStatus);
    break;
  }
  if (state?.status !== 'checkpointed') break;
}

console.log(`[autobot] Sustained run finished: ${totalUnits}/${requestedUnits} verified deterministic units; ${((Date.now() - started) / 60000).toFixed(2)} minutes elapsed; replenishments=${replenishments}; localBrainStarted=${localBrainStarted}.`);
