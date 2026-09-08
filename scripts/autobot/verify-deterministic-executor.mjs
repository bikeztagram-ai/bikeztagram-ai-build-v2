#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');
const executor = read('builder/runner/deterministic-executor.mjs');
const sustained = read('builder/runner/long-run-executor.mjs');
const library = JSON.parse(read('builder/brain/task-library.json'));
const selfImprovementLibrary = fs.existsSync(path.join(root, 'builder/brain/self-improvement-task-library.json')) ? JSON.parse(read('builder/brain/self-improvement-task-library.json')) : { tasks: [] };
const roadmap = JSON.parse(read('builder/brain/roadmap.json'));
const queue = JSON.parse(read('config/autonomous-builder-queue.json'));

const failures = [];
if (/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow)) failures.push('canonical fast workflow still depends on Gemini');
if (!workflow.includes('BUILDER_MAX_UNITS') || !workflow.includes('REQUESTED_DURATION')) failures.push('canonical fast workflow lacks deterministic budget inputs');
if (!executor.includes('writeCheckpoint') || !executor.includes('history')) failures.push('deterministic executor lacks durable completion history');
if (!executor.includes('verifiedThisRun')) failures.push('deterministic executor does not expose per-invocation verified units');
if (!executor.includes('unchangedButVerified')) failures.push('idempotent verified-task evidence is missing');
if (!executor.includes('history.objectives.has(dep)')) failures.push('executor does not unlock dependencies from durable objective history');
if (!sustained.includes('seedFromCheckpoint') || !/state\.status\s*===\s*['"]objective-complete['"]/.test(sustained)) failures.push('sustained runner does not seed completed objectives from durable checkpoint');
if (!sustained.includes('completedObjectives') || !sustained.includes('verifiedThisRun') || !/totalUnits\s*\+=\s*verifiedThisRun\.length/.test(sustained)) failures.push('sustained runner does not track cumulative units/objectives');
if (!sustained.includes('verifiedThisRun')) failures.push('sustained runner does not count only newly verified units');
if (!sustained.includes('BUILDER_COMPLETED_OBJECTIVES')) failures.push('sustained runner does not carry completed objectives between iterations');
if (!/verifiedThisRun\.length\s*===\s*0/.test(sustained)) failures.push('sustained runner lacks no-progress guard');
if (!executor.includes('process.env.BUILDER_COMPLETED_OBJECTIVES')) failures.push('deterministic executor does not consume carried objectives');

const allTasks = [...library.tasks, ...selfImprovementLibrary.tasks];
if (!Array.isArray(library.tasks) || !library.tasks.length) failures.push('task library is empty');
if (!Array.isArray(selfImprovementLibrary.tasks)) failures.push('self-improvement task library is malformed');
if (!Array.isArray(roadmap.objectives) || !roadmap.objectives.length) failures.push('roadmap is empty');
for (const task of allTasks) {
  if (!task.id || !task.objectiveId || !Array.isArray(task.implementation) || !Array.isArray(task.verify)) failures.push(`task ${task.id || '<unknown>'} lacks implementation/verification contract`);
}
const activeQueueIds = new Set((queue.batches || []).filter(b => b.objective && !['merged','rejected'].includes(b.status)).map(b => b.id));
for (const objective of roadmap.objectives) {
  if (!objective.queueBatch || !activeQueueIds.has(objective.queueBatch)) continue;
  if (!allTasks.some(task => task.objectiveId === objective.id && task.status === 'ready')) failures.push(`queued objective ${objective.id} has no ready implementation unit`);
}
if (failures.length) {
  console.error(failures.map(f => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log(`Deterministic AutoBot contract PASS: ${allTasks.length} implementation units across primary and self-improvement libraries, ${roadmap.objectives.length} objectives, durable history, checkpoint resume, idempotent verification, cumulative sustained accounting, and executable roadmap coverage PASS.`);
