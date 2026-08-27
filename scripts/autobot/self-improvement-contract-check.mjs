#!/usr/bin/env node
/** Contract check for the bounded AutoBot learning loop. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const executor = fs.readFileSync(path.join(root, 'builder', 'runner', 'deterministic-executor.mjs'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'scripts', 'autobot', 'self-improvement-runtime.mjs'), 'utf8');
const taskLibrary = JSON.parse(fs.readFileSync(path.join(root, 'builder', 'brain', 'task-library.json'), 'utf8'));

const requiredExecutorSignals = [
  'autobot-learning.json',
  'self-improvement-runtime.mjs',
  'qualityDebt',
  'reflect(task, objective.id'
];
for (const signal of requiredExecutorSignals) if (!executor.includes(signal)) throw new Error(`missing executor learning signal: ${signal}`);
for (const signal of ['qualityDebt', 'verificationChecks', 'nextRunBehaviour']) if (!runtime.includes(signal)) throw new Error(`missing learning runtime signal: ${signal}`);
const ids = taskLibrary.tasks.map(task => task.id);
for (const id of ['builder-run-history-analysis', 'builder-failure-patterns', 'builder-quality-gate-improvement', 'builder-task-design-improvement', 'builder-project-context-refresh']) if (!ids.includes(id)) throw new Error(`missing self-improvement task: ${id}`);
console.log('[autobot] self-improvement contract PASS.');
