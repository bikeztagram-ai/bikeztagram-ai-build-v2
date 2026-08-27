#!/usr/bin/env node
/** Gemini-free long-run executor: roadmap -> units -> verify -> checkpoint. */
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
function loadCheckpoint() { try { return readJson(checkpointPath); } catch { return { objectiveId: null, completed: [], status: 'new' }; } }
function writeCheckpoint(state) { fs.mkdirSync(workingDir, { recursive: true }); fs.writeFileSync(checkpointPath, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2) + '\n'); }
function live(state, message, verification = []) { writeLiveState({ runId: process.env.GITHUB_RUN_ID || 'local', status: state.status, objectiveId: state.objectiveId, currentTask: state.currentTask, completedUnits: state.completed.length, totalUnits: state.totalUnits || 0, startedAt, message, files: state.files || [], verification, blockedReason: state.error || null }); }
function runCommand(command, label) { const parts = command.split(/\s+/).filter(Boolean); if (!parts.length) throw new Error(`${label}: empty command`); console.log(`[autobot] ${label}: ${command}`); execFileSync(parts.shift(), parts, { cwd: root, stdio: 'inherit', env: process.env }); }
function allowedTask(task) { const protectedPrefixes = ['.github/workflows/', 'builder/runner/', 'builder/quality/', 'builder/monitor/', 'builder/review/', 'config/autonomous-builder-queue.json', 'scripts/prepare-autonomous-batch.mjs']; return !(task.files || []).some(file => protectedPrefixes.some(prefix => file.startsWith(prefix))); }

// Durable context is loaded before roadmap/task selection. The deterministic
// executor does not need a provider model: it uses the approved task library,
// but every decision is grounded in the same persistent project context.
const projectMemory = fs.readFileSync(memoryPath, 'utf8');
const lessons = fs.readFileSync(lessonsPath, 'utf8');
if (!projectMemory.includes('Bikeztagram AI') || !lessons.includes('Non-negotiable quality bar')) throw new Error('[autobot] Durable project context is incomplete.');
console.log(`[autobot] Durable context loaded: project memory ${projectMemory.length} chars, lessons ${lessons.length} chars.`);

const queue = readJson(queuePath); const roadmap = readJson(roadmapPath); const library = readJson(libraryPath);
const queuedIds = new Set(queue.batches.filter(b => b.objective && !['merged', 'rejected'].includes(b.status)).map(b => b.id));
const objective = roadmap.objectives.filter(o => o.status === 'queued' && queuedIds.has(o.queueBatch)).sort((a, b) => a.priority - b.priority).find(o => (o.dependsOn || []).every(dep => roadmap.objectives.find(x => x.id === dep)?.status === 'complete' || !roadmap.objectives.some(x => x.id === dep)));
if (!objective) { const state = { objectiveId: null, completed: [], totalUnits: 0, status: 'idle', currentTask: null, files: [] }; writeCheckpoint(state); live(state, 'No eligible roadmap objective. Idle.'); process.exit(0); }
const previous = loadCheckpoint(); const completed = previous.objectiveId === objective.id ? [...new Set(previous.completed || [])] : [];
const tasks = library.tasks.filter(t => t.objectiveId === objective.id && t.status === 'ready');
const state = { objectiveId: objective.id, completed, totalUnits: tasks.length, currentTask: null, status: 'running', files: [] };
if (!tasks.length) { state.status = 'blocked'; state.error = 'No ready deterministic tasks'; writeCheckpoint(state); live(state, state.error); throw new Error(`[autobot] ${state.error} for ${objective.id}`); }
const evidence = { schemaVersion: 1, runId: process.env.GITHUB_RUN_ID || 'local', objectiveId: objective.id, startedAt, units: [] };
writeCheckpoint(state); live(state, `Starting ${objective.id}`);
for (const task of tasks) {
  if (completed.includes(task.id)) continue;
  if (completed.length >= maxUnits || (Date.now() - started) / 60000 >= maxMinutes) break;
  if (!allowedTask(task)) { state.status = 'blocked'; state.currentTask = task.id; state.error = 'Protected-path task rejected'; writeCheckpoint(state); live(state, state.error); throw new Error(`[autobot] ${state.error}: ${task.id}`); }
  if (!Array.isArray(task.implementation) || task.implementation.length === 0) { state.status = 'blocked'; state.currentTask = task.id; state.error = 'Task has no declared implementation commands'; writeCheckpoint(state); live(state, state.error); throw new Error(`[autobot] Refusing no-op task: ${task.id}`); }
  const unmet = (task.dependsOn || []).filter(dep => !completed.includes(dep)); if (unmet.length) continue;
  state.currentTask = task.id; state.status = 'running'; const before = git(['status', '--porcelain']);
  const unitEvidence = { id: task.id, startedAt: new Date().toISOString(), implementation: task.implementation, verify: task.verify || [], before };
  writeCheckpoint(state); live(state, `Building ${task.id}`);
  try {
    for (const command of task.implementation) runCommand(command, task.id);
    const verification = []; for (const command of task.verify || []) { runCommand(command, `${task.id} verification`); verification.push({ command, status: 'passed' }); live(state, `${task.id}: verification passed`, verification); }
    const after = git(['status', '--porcelain']); if (before === after) throw new Error('No repository change detected; refusing to mark task complete.');
    unitEvidence.after = after; unitEvidence.verification = verification; unitEvidence.completedAt = new Date().toISOString(); evidence.units.push(unitEvidence); fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    completed.push(task.id); state.currentTask = null; state.lastVerifiedTask = task.id; state.files = after.split('\n').filter(Boolean).map(line => ({ status: line.slice(0, 2).trim(), path: line.slice(3).trim() })); writeCheckpoint(state); live(state, `${task.id} verified and checkpointed`, verification);
  } catch (error) { unitEvidence.failedAt = new Date().toISOString(); unitEvidence.error = error.message; evidence.units.push(unitEvidence); fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n'); state.status = 'blocked'; state.error = error.message; state.blockedTask = task.id; writeCheckpoint(state); live(state, `BLOCKED: ${task.id} — ${error.message}`); console.error(`[autobot] BLOCKED on ${task.id}: ${error.message}`); process.exit(2); }
}
state.currentTask = null; state.status = completed.length === tasks.length ? 'objective-complete' : 'checkpointed'; writeCheckpoint(state); live(state, state.status === 'objective-complete' ? 'All deterministic units verified.' : 'Run limit reached; safe checkpoint created.'); console.log(`[autobot] ${state.status}: ${completed.length}/${tasks.length} units verified.`);
