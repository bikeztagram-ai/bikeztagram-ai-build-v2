#!/usr/bin/env node
/**
 * Static contract harness for the failure mode where a prior completed
 * objective remains queued in the roadmap and the sustained runner must use
 * durable checkpoint state to unlock its downstream objective.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sustained = fs.readFileSync(path.join(root, 'builder/runner/long-run-executor.mjs'), 'utf8');
const executor = fs.readFileSync(path.join(root, 'builder/runner/deterministic-executor.mjs'), 'utf8');

const required = [
  ['durable checkpoint seed', "initial?.status === 'objective-complete'"],
  ['objective id seed', 'initial.objectiveId'],
  ['downstream dependency carry', 'BUILDER_COMPLETED_OBJECTIVES'],
  ['run-local unit budget', 'new verified units']
];
for (const [label, token] of required) {
  if (!sustained.includes(token) && !executor.includes(token)) {
    console.error(`FAIL: missing ${label}`);
    process.exit(1);
  }
}
console.log('Durable objective handoff regression PASS.');
