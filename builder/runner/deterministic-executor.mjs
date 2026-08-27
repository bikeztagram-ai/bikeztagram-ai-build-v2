#!/usr/bin/env node
/** Gemini-free long-run executor: roadmap -> units -> verify -> checkpoint. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const brainDir = path.join(root, 'builder', 'brain');
const workingDir = path.join(root, 'builder', 'working');
const queuePath = path.join(root, 'config', 'autonomous-builder-queue.json');
const roadmapPath = path.join(brainDir, 'roadmap.json');
const libraryPath = path.join(brainDir, 'task-library.json');
const checkpointPath = path.join(workingDir, 'deterministic-autobot.json');
const maxUnits = Number.parseInt(process.env.BUILDER_MAX_UNITS || '20', 10);
const maxMinutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '240', 10);
const started = Date.now();

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function loadCheckpoint() {
  try { return readJson(checkpointPath); } catch { return { objectiveId: null, completed: [], status: 'new' }; }
}
function writeCheckpoint(state) {
  fs.mkdirSync(workingDir, { recursive: true });
  fs.writeFileSync(checkpointPath, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}
function runCommand(command, label) {
  const parts = command.split(/\s+/).filter(Boolean);
  if (!parts.length) throw new Error(`${label}: empty command`);
  console.log(`[autobot] ${label}: ${command}`);
  execFileSync(parts.shift(), parts, { cwd: root, stdio: 'inherit', env: process.env });
}
function allowedTask(task) {
  const protectedPrefixes = ['.github/workflows/', 'builder/runner/', 'builder/quality/', 'config/autonomous-builder-queue.json', 'scripts/prepare-autonomous-batch.mjs'];
  return !(task.files || []).some(file => protectedPrefixes.some(prefix => file.startsWith(prefix)));
}

const queue = readJson(queuePath);
const roadmap = readJson(roadmapPath);
const library = readJson(libraryPath);
const queuedIds = new Set(queue.batches.filter(b => b.objective && !['merged', 'rejected'].includes(b.status)).map(b => b.id));
const objective = roadmap.objectives
  .filter(o => o.status === 'queued' && queuedIds.has(o.queueBatch))
  .sort((a, b) => a.priority - b.priority)
  .find(o => o.dependsOn.every(dep => roadmap.objectives.find(x => x.id === dep)?.status === 'complete' || !roadmap.objectives.some(x => x.id === dep)));

if (!objective) {
  writeCheckpoint({ objectiveId: null, completed: [], status: 'idle', currentTask: null });
  console.log('[autobot] No eligible roadmap objective. Idle.');
  process.exit(0);
}

const previous = loadCheckpoint();
const completed = previous.objectiveId === objective.id ? [...new Set(previous.completed || [])] : [];
const tasks = library.tasks.filter(t => t.objectiveId === objective.id && t.status === 'ready');
const state = { objectiveId: objective.id, completed, currentTask: null, status: 'running' };
if (!tasks.length) {
  state.status = 'blocked'; state.blockedTask = 'no-ready-task'; writeCheckpoint(state);
  throw new Error(`[autobot] No ready deterministic tasks for ${objective.id}`);
}

writeCheckpoint(state);
for (const task of tasks) {
  if (completed.includes(task.id)) continue;
  if (completed.length >= maxUnits || (Date.now() - started) / 60000 >= maxMinutes) break;
  if (!allowedTask(task)) {
    state.status = 'blocked'; state.blockedTask = task.id; writeCheckpoint(state);
    throw new Error(`[autobot] Protected-path task rejected: ${task.id}`);
  }
  const unmet = (task.dependsOn || []).filter(dep => !completed.includes(dep));
  if (unmet.length) continue;
  state.currentTask = task.id; writeCheckpoint(state);
  try {
    for (const command of task.implementation || []) runCommand(command, task.id);
    for (const command of task.verify || []) runCommand(command, `${task.id} verification`);
    completed.push(task.id); state.currentTask = null; state.lastVerifiedTask = task.id; writeCheckpoint(state);
  } catch (error) {
    state.status = 'blocked'; state.blockedTask = task.id; state.error = error.message; writeCheckpoint(state);
    console.error(`[autobot] BLOCKED on ${task.id}: ${error.message}`);
    process.exit(2);
  }
}

state.currentTask = null;
state.status = completed.length === tasks.length ? 'objective-complete' : 'checkpointed';
writeCheckpoint(state);
console.log(`[autobot] ${state.status}: ${completed.length}/${tasks.length} units verified.`);
