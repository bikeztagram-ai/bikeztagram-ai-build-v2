import fs from 'node:fs';

const memory = fs.readFileSync('builder/quality/project-memory.md', 'utf8');
const lessons = fs.readFileSync('builder/quality/lessons.md', 'utf8');
const runner = fs.readFileSync('builder/runner/task-driven.mjs', 'utf8');

const checks = [
  ['persistent project memory exists', memory.includes('# Bikeztagram AI — Persistent Project Memory')],
  ['product north star recorded', memory.includes('AI creative director') && memory.includes('original scenes')],
  ['copyright-safe principle recorded', memory.includes('copyright-safe')],
  ['durable lessons remain present', lessons.includes('green workflow is not proof')],
  ['memory workflow defined', memory.includes('Every-batch operating model') && memory.includes('check-fix-check-continue')],
  ['prompt-quality rules defined', memory.includes('Prompt-quality rules') && memory.includes('user-visible behaviour')],
  ['review backlog policy defined', memory.includes('must not block later eligible batches')],
  ['builder runner remains bounded', runner.includes('BUILDER_MAX_PASSES')]
];
const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  console.error('Persistent project memory verification failed:');
  failures.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}
console.log(`Persistent project memory verification passed: ${checks.length}/${checks.length} checks.`);
