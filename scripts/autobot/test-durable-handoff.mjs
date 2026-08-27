#!/usr/bin/env node
/** Deterministic regression guard for durable objective handoff. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sustained = fs.readFileSync(path.join(root, 'builder/runner/long-run-executor.mjs'), 'utf8');
const executor = fs.readFileSync(path.join(root, 'builder/runner/deterministic-executor.mjs'), 'utf8');

const required = [
  ['checkpoint is read before the first iteration', 'const initial = readState();'],
  ['completed objective is seeded from the durable checkpoint', "initial?.status === 'objective-complete'"],
  ['the durable objective id is carried forward', 'initial.objectiveId'],
  ['carried objective IDs are exported to the child executor', 'BUILDER_COMPLETED_OBJECTIVES'],
  ['the executor accepts carried dependency completion', 'carriedObjectives.has(dep)'],
  ['the run-local budget excludes historical work', 'new verified units']
];
for (const [label, token] of required) {
  const present = sustained.includes(token) || executor.includes(token);
  if (!present) {
    console.error(`FAIL: missing ${label}`);
    process.exit(1);
  }
}
console.log('Durable objective handoff regression PASS.');
