#!/usr/bin/env node
/**
 * Runtime hardening for the local Qwen feature brain.
 * Repairs two stale/reliability contracts in an idempotent way before each agent slice.
 */
import fs from 'node:fs';

const brain = 'builder/runner/repository-aware-feature-brain.mjs';
let source = fs.readFileSync(brain, 'utf8');
const before = "  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') return `${syntax}; repair this edit before continuing.`;\n  return `EDIT APPLIED: ${file}`;\n";
const after = "  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') {\n    fs.writeFileSync(abs(file), current);\n    return `ERROR: edit rejected and rolled back; ${syntax}. The file is restored to its pre-edit state. Choose a smaller, syntactically complete replacement.`;\n  }\n  return `EDIT APPLIED: ${file}`;\n";
if (source.includes(before)) {
  source = source.replace(before, after);
  fs.writeFileSync(brain, source);
  console.log('[autobot] feature-brain edit-level syntax rollback hardened.');
} else if (source.includes('edit rejected and rolled back')) {
  console.log('[autobot] feature-brain edit-level syntax rollback already present.');
} else {
  throw new Error('feature-brain edit guard marker not found; refusing blind patch');
}

const task = 'builder/brain/task-library.json';
let tasks = fs.readFileSync(task, 'utf8');
if (tasks.includes('npm run verify:batch33')) {
  tasks = tasks.replaceAll('npm run verify:batch33', 'node scripts/autobot/export-contract-check.mjs');
  fs.writeFileSync(task, tasks);
  console.log('[autobot] repaired stale export verification command: verify:batch33 -> export-contract-check.');
} else {
  console.log('[autobot] export verification command already repaired.');
}
