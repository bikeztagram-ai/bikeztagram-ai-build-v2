#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflow = fs.readFileSync(path.join(root, '.github/workflows/autonomous-builder-v2.yml'), 'utf8');
const executor = fs.readFileSync(path.join(root, 'builder/runner/deterministic-executor.mjs'), 'utf8');
const sustained = fs.readFileSync(path.join(root, 'builder/runner/long-run-executor.mjs'), 'utf8');
const library = JSON.parse(fs.readFileSync(path.join(root, 'builder/brain/task-library.json'), 'utf8'));
const roadmap = JSON.parse(fs.readFileSync(path.join(root, 'builder/brain/roadmap.json'), 'utf8'));
const queue = JSON.parse(fs.readFileSync(path.join(root, 'config/autonomous-builder-queue.json'), 'utf8'));

const failures = [];
if (/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow)) failures.push('V2 workflow still depends on Gemini');
if (!executor.includes('writeCheckpoint') || !executor.includes('history')) failures.push('deterministic executor lacks durable completion history');
if (!executor.includes('verifiedThisRun')) failures.push('deterministic executor does not expose per-invocation verified units');
if (!executor.includes('unchangedButVerified')) failures.push('idempotent verified-task evidence is missing');
if (!executor.includes('history.objectives.has(dep)')) failures.push('executor does not unlock dependencies from durable objective history');
if (!sustained.includes('seedFromCheckpoint') || !sustained.includes("state.status === 'objective-complete'")) failures.push('sustained runner does not seed completed objectives from durable checkpoint');
if (!sustained.includes('verifiedThisRun')) failures.push('sustained runner does not count only newly verified units');
if (!sustained.includes('BUILDER_COMPLETED_OBJECTIVES')) failures.push('sustained runner does not carry completed objectives between iterations');
if (!sustained.includes('verifiedThisRun.length === 0')) failures.push('sustained runner lacks no-progress guard');
if (!executor.includes('process.env.BUILDER_COMPLETED_OBJECTIVES')) failures.push('deterministic executor does not consume carried objectives');
if (!Array.isArray(library.tasks) || !library.tasks.length) failures.push('task library is empty');
if (!Array.isArray(roadmap.objectives) || !roadmap.objectives.length) failures.push('roadmap is empty');
for (const task of library.tasks) {
  if (!task.id || !task.objectiveId || !Array.isArray(task.implementation) || !Array.isArray(task.verify)) failures.push(`task ${task.id || '<unknown>'} lacks implementation/verification contract`);
}
const activeQueueIds = new Set((queue.batches || []).filter(b => b.objective && !['merged','rejected'].includes(b.status)).map(b => b.id));
for (const objective of roadmap.objectives) {
  if (!objective.queueBatch || !activeQueueIds.has(objective.queueBatch)) continue;
  if (!library.tasks.some(task => task.objectiveId === objective.id && task.status === 'ready')) failures.push(`queued objective ${objective.id} has no ready implementation unit`);
}
if (failures.length) {
  console.error(failures.map(f => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log(`Deterministic AutoBot contract PASS: ${library.tasks.length} implementation units, ${roadmap.objectives.length} objectives, durable progress, checkpoint resume, idempotent verification and sustained accounting PASS.`);
