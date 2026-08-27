import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runner = fs.readFileSync(path.join(root, 'builder/runner/deterministic-executor.mjs'), 'utf8');
const memory = fs.readFileSync(path.join(root, 'builder/quality/project-memory.md'), 'utf8');
const lessons = fs.readFileSync(path.join(root, 'builder/quality/lessons.md'), 'utf8');
const contract = fs.readFileSync(path.join(root, 'builder/quality/memory-loading.md'), 'utf8');
const queue = fs.readFileSync(path.join(root, 'config/autonomous-builder-queue.json'), 'utf8');

const checks = [
  ['project memory exists', memory.includes('# Bikeztagram AI — Persistent Project Memory')],
  ['memory loading contract exists', contract.includes('Required first reads')],
  ['deterministic runner loads project memory', runner.includes("const memoryPath=path.join(root,'builder','quality','project-memory.md')") || runner.includes("path.join(root, 'builder', 'quality', 'project-memory.md')")],
  ['deterministic runner loads lessons', runner.includes("const lessonsPath=path.join(root,'builder','quality','lessons.md')") || runner.includes("path.join(root, 'builder', 'quality', 'lessons.md')")],
  ['deterministic runner loads queue context', runner.includes("const queuePath=path.join(root,'config','autonomous-builder-queue.json')") || runner.includes("path.join(root, 'config', 'autonomous-builder-queue.json')")],
  ['runner has objective and acceptance context', runner.includes('objective') && runner.includes('tasks')],
  ['queue is readable', queue.includes('"batches"')],
  ['durable lessons remain present', lessons.includes('green workflow is not proof that the product change is good')]
];

const failures = checks.filter(([, ok]) => !ok);
if (failures.length) {
  console.error('Persistent project memory verification failed:');
  for (const [name] of failures) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Persistent project memory verification passed: ${checks.length}/${checks.length}`);
