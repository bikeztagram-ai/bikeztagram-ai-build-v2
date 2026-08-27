#!/usr/bin/env node
/**
 * Gemini-free AutoBot executor.
 *
 * The executor is deliberately deterministic: the durable task library defines
 * what is allowed to run; this process only executes declared implementation
 * units, verifies them, checkpoints progress, and stops safely on blockers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const brainDir = path.join(root, 'builder', 'brain');
const workingDir = path.join(root, 'builder', 'working');
const queuePath = path.join(root, 'config', 'autonomous-builder-queue.json');
const libraryPath = path.join(brainDir, 'task-library.json');
const checkpointPath = path.join(workingDir, 'deterministic-autobot.md');

const maxUnits = Number.parseInt(process.env.BUILDER_MAX_UNITS || '20', 10);
const maxMinutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '240', 10);
const started = Date.now();

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeCheckpoint(state) {
  fs.mkdirSync(workingDir, { recursive: true });
  const lines = [
    '# Deterministic AutoBot checkpoint',
    '',
    `Updated: ${new Date().toISOString()}`,
    `Objective: ${state.objectiveId || 'none'}`,
    `Current task: ${state.currentTask || 'none'}`,
    `Completed units: ${state.completed.join(', ') || 'none'}`,
    `Blocked task: ${state.blockedTask || 'none'}`,
    `Status: ${state.status}`,
    '',
    'This checkpoint is machine-readable by the next run and is only written after verified progress or a truthful blocker.',
    ''
  ];
  fs.writeFileSync(checkpointPath, lines.join('\n'));
}

function runCommand(command, label) {
  const parts = command.split(' ').filter(Boolean);
  if (!parts.length) throw new Error(`${label}: empty command`);
  const executable = parts.shift();
  console.log(`[autobot] ${label}: ${command}`);
  execFileSync(executable, parts, { cwd: root, stdio: 'inherit', env: process.env });
}

function allowedTask(task) {
  const protectedPaths = [
    '.github/workflows/',
    'builder/runner/',
    'builder/quality/',
    'config/autonomous-builder-queue.json',
    'scripts/prepare-autonomous-batch.mjs'
  ];
  return !((task.files || []).some(file => protectedPaths.some(prefix => file.startsWith(prefix))));
}

const library = readJson(libraryPath);
const queue = readJson(queuePath);
const queued = queue.batches.find(batch => batch.objective && !['merged', 'rejected'].includes(batch.status));

if (!queued) {
  writeCheckpoint({ status: 'idle', completed: [] });
  console.log('[autobot] No executable queued objective. Idle.');
  process.exit(0);
}

const objectiveId = library.tasks.find(task => task.objectiveId === 'project-persistence')?.objectiveId ||
  queued.id.replace(/^batch-/, 'batch-');
const tasks = library.tasks.filter(task => task.objectiveId === objectiveId && task.status === 'ready');
const completed = [];
const state = { objectiveId, currentTask: null, completed, status: 'running' };

if (!tasks.length) {
  state.status = 'blocked';
  state.blockedTask = 'no-ready-task';
  writeCheckpoint(state);
  throw new Error(`[autobot] No ready deterministic tasks for ${objectiveId}`);
}

writeCheckpoint(state);

for (const task of tasks) {
  if (completed.length >= maxUnits) break;
  if ((Date.now() - started) / 60000 >= maxMinutes) break;
  if (!allowedTask(task)) {
    state.status = 'blocked';
    state.blockedTask = task.id;
    writeCheckpoint(state);
    throw new Error(`[autobot] Protected-path task rejected: ${task.id}`);
  }
  if (task.dependsOn?.some(dep => !completed.includes(dep) && tasks.some(t => t.id === dep))) {
    continue;
  }
  state.currentTask = task.id;
  writeCheckpoint(state);
  try {
    for (const command of task.implementation || []) runCommand(command, task.id);
    for (const command of task.verify || []) runCommand(command, `${task.id} verification`);
    completed.push(task.id);
    state.currentTask = null;
    writeCheckpoint(state);
  } catch (error) {
    state.status = 'blocked';
    state.blockedTask = task.id;
    writeCheckpoint(state);
    console.error(`[autobot] BLOCKED on ${task.id}: ${error.message}`);
    process.exit(2);
  }
}

state.status = completed.length === tasks.length ? 'complete' : 'checkpointed';
state.currentTask = null;
writeCheckpoint(state);
console.log(`[autobot] ${state.status}: ${completed.length}/${tasks.length} deterministic units verified.`);
