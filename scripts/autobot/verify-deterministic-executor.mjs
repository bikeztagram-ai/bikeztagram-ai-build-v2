#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflow = fs.readFileSync(path.join(root, '.github/workflows/autonomous-builder-v2.yml'), 'utf8');
const executor = fs.readFileSync(path.join(root, 'builder/runner/deterministic-executor.mjs'), 'utf8');
const library = JSON.parse(fs.readFileSync(path.join(root, 'builder/brain/task-library.json'), 'utf8'));
const roadmap = JSON.parse(fs.readFileSync(path.join(root, 'builder/brain/roadmap.json'), 'utf8'));

const failures = [];
if (/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow)) failures.push('V2 workflow still depends on Gemini');
if (!executor.includes('deterministic') || !executor.includes('writeCheckpoint')) failures.push('deterministic executor/checkpoint contract missing');
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
console.log(`Deterministic AutoBot contract PASS: ${library.tasks.length} implementation units, ${roadmap.objectives.length} objectives.`);
