import fs from 'node:fs';
const runner = fs.readFileSync('builder/runner/task-driven.mjs', 'utf8');
const memory = fs.readFileSync('builder/quality/project-memory.md', 'utf8');
const lessons = fs.readFileSync('builder/quality/lessons.md', 'utf8');
const contract = fs.readFileSync('builder/quality/memory-loading.md', 'utf8');
const checks = [
  ['project memory exists', memory.includes('# Bikeztagram AI — Persistent Project Memory')],
  ['memory loading contract exists', contract.includes('Required first reads')],
  ['runner explicitly loads project memory', runner.includes('read builder/quality/project-memory.md')],
  ['runner explicitly loads lessons', runner.includes('read builder/quality/lessons.md')],
  ['runner explicitly loads queue context', runner.includes('read builder/quality/lessons.md and config/autonomous-builder-queue.json')],
  ['runner preserves objective authority', runner.includes('current objective and acceptance criteria remain authoritative')],
  ['runner asks for durable lessons', runner.includes('record it in the durable quality memory')],
  ['existing lessons remain present', lessons.includes('green workflow is not proof that the product change is good')]
];
const failures = checks.filter(([, ok]) => !ok);
if (failures.length) { console.error('Persistent project memory verification failed:'); for (const [name] of failures) console.error(`- ${name}`); process.exit(1); }
console.log(`Persistent project memory verification passed: ${checks.length}/${checks.length}`);
