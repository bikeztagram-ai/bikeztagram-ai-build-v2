#!/usr/bin/env node
/** Gemini-free long-run executor: roadmap -> units -> verify -> durable progress. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeLiveState } from '../monitor/write-live-state.mjs';

const root = process.cwd();
const brainDir = path.join(root, 'builder', 'brain');
const workingDir = path.join(root, 'builder', 'working');
const queuePath = path.join(root, 'config', 'autonomous-builder-queue.json');
const roadmapPath = path.join(brainDir, 'roadmap.json');
const libraryPath = path.join(brainDir, 'task-library.json');
const memoryPath = path.join(root, 'builder', 'quality', 'project-memory.md');
const lessonsPath = path.join(root, 'builder', 'quality', 'lessons.md');
const checkpointPath = path.join(workingDir, 'deterministic-autobot.json');
const evidencePath = path.join(workingDir, 'deterministic-autobot-evidence.json');
const maxUnits = Number.parseInt(process.env.BUILDER_MAX_UNITS || '100', 10);
const maxMinutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '360', 10);
const started = Date.now();
const startedAt = new Date().toISOString();
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function git(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
function loadCheckpoint() { try { return readJson(checkpointPath); } catch { return { objectiveId: null, completed: [], status: 'new', history: { tasks: [], objectives: [] } }; } }
function normaliseHistory(previous) {
  const history = previous.history && typeof previous.history === 'object' ? previous.history : { tasks: [], objectives: [] };
  const tasks = new Set(Array.isArray(history.tasks) ? history.tasks : []);
  const objectives = new Set(Array.isArray(history.objectives) ? history.objectives : []);
  if (previous.objectiveId) for (const taskId of previous.completed || []) tasks.add(`${previous.objectiveId}:${taskId}`);
  if (previous.objectiveId && previous.status === 'objective-complete') objectives.add(previous.objectiveId);
  return { tasks, objectives };
}
function writeCheckpoint(state) {
  fs.mkdirSync(workingDir, { recursive: true });
  const serial = { ...state, history: { tasks: [...state.history.tasks].sort(), objectives: [...state.history.objectives].sort() }, updatedAt: new Date().toISOString() };
  fs.writeFileSync(checkpointPath, JSON.stringify(serial, null, 2) + '\n');
}
function live(state, message, verification = []) { writeLiveState({ runId: process.env.GITHUB_RUN_ID || 'local', status: state.status, objectiveId: state.objectiveId, currentTask: state.currentTask, completedUnits: state.completed.length, totalUnits: state.totalUnits || 0, startedAt, message, files: state.files || [], verification, blockedReason: state.error || null }); }
function runCommand(command, label) { const parts = command.split(/\s+/).filter(Boolean); if (!parts.length) throw new Error(`${label}: empty command`); console.log(`[autobot] ${label}: ${command}`); execFileSync(parts.shift(), parts, { cwd: root, stdio: 'inherit', env: process.env }); }
function allowedTask(task) { const protectedPrefixes = ['.github/workflows/', 'builder/runner/', 'builder/quality/', 'builder/monitor/', 'builder/review/', 'config/autonomous-builder-queue.json', 'scripts/prepare-autonomous-batch.mjs']; return !(task.files || []).some(file => protectedPrefixes.some(prefix => file.startsWith(prefix))); }

const projectMemory = fs.readFileSync(memoryPath, 'utf8');
const lessons = fs.readFileSync(lessonsPath, 'utf8');
if (!projectMemory.includes('Bikeztagram AI') || !lessons.includes('Non-negotiable quality bar')) throw new Error('[autobot] Durable project context is incomplete.');
console.log(`[autobot] Durable context loaded: project memory ${projectMemory.length} chars, lessons ${lessons.length} chars.`);

const queue = readJson(queuePath); const roadmap = readJson(roadmapPath); const library = readJson(libraryPath);
const previous = loadCheckpoint();
const history = normaliseHistory(previous);
const carriedObjectives = new Set((process.env.BUILDER_COMPLETED_OBJECTIVES || '').split(',').map(s => s.trim()).filter(Boolean));
for (const objectiveId of carriedObjectives) history.objectives.add(objectiveId);
const queuedIds = new Set(queue.batches.filter(b => b.objective && !['merged', 'rejected'].includes(b.status)).map(b => b.id));
const candidates = roadmap.objectives.filter(o => o.status === 'queued' && queuedIds.has(o.queueBatch)).sort((a, b) => a.priority - b.priority).filter(o => (o.dependsOn || []).every(dep => roadmap.objectives.find(x => x.id === dep)?.status === 'complete' || history.objectives.has(dep) || !roadmap.objectives.some(x => x.id === dep)));

let objective = null; let tasks = []; let carriedCompleted = [];
for (const candidate of candidates) {
  const candidateTasks = library.tasks.filter(t => t.objectiveId === candidate.id && t.status === 'ready');
  const candidateCompleted = candidateTasks.filter(t => history.tasks.has(`${candidate.id}:${t.id}`)).map(t => t.id);
  if (previous.objectiveId === candidate.id) for (const taskId of previous.completed || []) if (candidateTasks.some(t => t.id === taskId)) candidateCompleted.push(taskId);
  const uniqueCompleted = [...new Set(candidateCompleted)];
  const remaining = candidateTasks.filter(t => !uniqueCompleted.includes(t.id));
  if (remaining.length) { objective = candidate; tasks = candidateTasks; carriedCompleted = uniqueCompleted; break; }
  if (candidateTasks.length && uniqueCompleted.length === candidateTasks.length) history.objectives.add(candidate.id);
}
if (!objective) {
  const state = { objectiveId: null, completed: [], verifiedThisRun: [], noOpVerifiedThisRun: [], totalUnits: 0, status: 'idle', currentTask: null, files: [], history };
  writeCheckpoint(state); live(state, 'No eligible unfinished roadmap units. Idle.'); process.exit(0);
}

const completed = carriedCompleted;
const verifiedThisRun = [];
const noOpVerifiedThisRun = [];
const state = { objectiveId: objective.id, completed, verifiedThisRun, noOpVerifiedThisRun, totalUnits: tasks.length, currentTask: null, status: 'running', files: [], history };
writeCheckpoint(state); live(state, `Starting ${objective.id}`);
const evidence = { schemaVersion: 2, runId: process.env.GITHUB_RUN_ID || 'local', objectiveId: objective.id, startedAt, units: [] };
for (const task of tasks) {
  if (completed.includes(task.id)) continue;
  if (completed.length >= maxUnits || (Date.now() - started) / 60000 >= maxMinutes) break;
  if (!allowedTask(task)) { state.status = 'blocked'; state.currentTask = task.id; state.error = 'Protected-path task rejected'; writeCheckpoint(state); live(state, state.error); throw new Error(`[autobot] ${state.error}: ${task.id}`); }
  if (!Array.isArray(task.implementation) || task.implementation.length === 0) { state.status = 'blocked'; state.currentTask = task.id; state.error = 'Task has no declared implementation commands'; writeCheckpoint(state); live(state, state.error); throw new Error(`[autobot] Refusing no-op task: ${task.id}`); }
  const unmet = (task.dependsOn || []).filter(dep => !completed.includes(dep) && !history.tasks.has(`${objective.id}:${dep}`)); if (unmet.length) continue;
  state.currentTask = task.id; state.status = 'running'; const before = git(['status', '--porcelain']);
  const unitEvidence = { id: task.id, startedAt: new Date().toISOString(), implementation: task.implementation, verify: task.verify || [], before };
  writeCheckpoint(state); live(state, `Building ${task.id}`);
  try {
    for (const command of task.implementation) runCommand(command, task.id);
    const verification = [];
    for (const command of task.verify || []) { runCommand(command, `${task.id} verification`); verification.push({ command, status: 'passed' }); live(state, `${task.id}: verification passed`, verification); }
    const after = git(['status', '--porcelain']);
    const changed = before !== after;
    if (!changed) console.log(`[autobot] ${task.id}: implementation already satisfied; verification passed; recording as idempotent verification, not new work.`);
    unitEvidence.after = after; unitEvidence.verification = verification; unitEvidence.completedAt = new Date().toISOString(); unitEvidence.unchangedButVerified = !changed;
    evidence.units.push(unitEvidence); fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    completed.push(task.id);
    if (changed) verifiedThisRun.push(task.id); else noOpVerifiedThisRun.push(task.id);
    history.tasks.add(`${objective.id}:${task.id}`);
    state.currentTask = null; state.lastVerifiedTask = task.id; state.files = after.split('\n').filter(Boolean).map(line => ({ status: line.slice(0, 2).trim(), path: line.slice(3).trim() }));
    writeCheckpoint(state); live(state, changed ? `${task.id} newly implemented, verified and checkpointed` : `${task.id} verified as already satisfied; no new implementation counted`, verification);
  } catch (error) { unitEvidence.failedAt = new Date().toISOString(); unitEvidence.error = error.message; evidence.units.push(unitEvidence); fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n'); state.status = 'blocked'; state.error = error.message; state.blockedTask = task.id; writeCheckpoint(state); live(state, `BLOCKED: ${task.id} — ${error.message}`); console.error(`[autobot] BLOCKED on ${task.id}: ${error.message}`); process.exit(2); }
}
const objectiveComplete = completed.length === tasks.length;
if (objectiveComplete) history.objectives.add(objective.id);
state.currentTask = null; state.status = objectiveComplete ? 'objective-complete' : 'checkpointed';
writeCheckpoint(state); live(state, objectiveComplete ? 'All deterministic units verified.' : 'Run limit reached; safe checkpoint created.'); console.log(`[autobot] ${state.status}: ${verifiedThisRun.length} new units verified, ${noOpVerifiedThisRun.length} already-satisfied units verified (not counted as new work); objective ${completed.length}/${tasks.length}; durable history has ${history.tasks.size} task completions.`);
