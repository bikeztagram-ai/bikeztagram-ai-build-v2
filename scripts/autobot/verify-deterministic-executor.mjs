#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const workflow = fs.readFileSync(path.join(root, '.github/workflows/autonomous-builder-v2.yml'), 'utf8');
const executor = fs.readFileSync(path.join(root, 'builder/runner/deterministic-executor.mjs'), 'utf8');
const sustained = fs.readFileSync(path.join(root, 'builder/runner/long-run-executor.mjs'), 'utf8');
const library = JSON.parse(fs.readFileSync(path.join(root, 'builder/brain/task-library.json'), 'utf8'));
const roadmap = JSON.parse(fs.readFileSync(path.join(root, 'builder/brain/roadmap.json'), 'utf8'));

const failures = [];
if (/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow)) failures.push('V2 workflow still depends on Gemini');
if (!executor.includes('deterministic') || !executor.includes('writeCheckpoint')) failures.push('deterministic executor/checkpoint contract missing');
if (!sustained.includes('BUILDER_COMPLETED_OBJECTIVES')) failures.push('sustained runner does not carry completed objectives');
if (!sustained.includes('completedKeys') || !sustained.includes('completedObjectives')) failures.push('sustained runner does not track cumulative units/objectives');
if (!sustained.includes("initial?.status === 'objective-complete'")) failures.push('sustained runner does not seed durable completed-objective checkpoint state');
if (!sustained.includes('initial.objectiveId')) failures.push('sustained runner does not seed the completed objective id');
if (!sustained.includes('new verified units')) failures.push('sustained runner does not distinguish run-local unit budget from historical checkpoint state');
if (!executor.includes('carriedObjectives.has(dep)')) failures.push('deterministic executor does not satisfy downstream dependencies from the current run');
if (!executor.includes('process.env.BUILDER_COMPLETED_OBJECTIVES')) failures.push('deterministic executor does not consume carried objectives');
if (!Array.isArray(library.tasks) || !library.tasks.length) failures.push('task library is empty');
if (!Array.isArray(roadmap.objectives) || !roadmap.objectives.length) failures.push('roadmap is empty');
for (const task of library.tasks) {
  if (!task.id || !task.objectiveId || !Array.isArray(task.implementation) || !Array.isArray(task.verify)) {
    failures.push(`task ${task.id || '<unknown>'} lacks implementation/verification contract`);
  }
}
if (failures.length) {
  console.error(failures.map(f => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
execFileSync(process.execPath, ['scripts/autobot/test-durable-handoff.mjs'], { cwd: root, stdio: 'inherit' });
console.log(`Deterministic AutoBot contract PASS: ${library.tasks.length} implementation units, ${roadmap.objectives.length} objectives, durable handoff guard PASS.`);
