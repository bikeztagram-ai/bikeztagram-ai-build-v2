#!/usr/bin/env node
/** Run every available deterministic quality gate and fail closed. */
import { execFileSync } from 'node:child_process';

const gates = [
  ['change-scope', 'builder/quality/change-scope.mjs'],
  ['regression', 'builder/quality/regression-gate.mjs'],
  ['acceptance', 'builder/quality/acceptance-gate.mjs'],
  ['merge-readiness', 'builder/quality/merge-readiness.mjs']
];
const results = [];
for (const [name, file] of gates) {
  try {
    execFileSync('node', [file], { stdio: 'inherit', env: process.env });
    results.push({ name, status: 'passed' });
  } catch (error) {
    results.push({ name, status: 'failed', exitCode: error.status ?? null });
    console.error(`[quality] ${name} failed; stopping fail-closed gate chain.`);
    break;
  }
}
console.log(JSON.stringify({ status: results.every(x => x.status === 'passed') ? 'passed' : 'failed', results, generatedAt: new Date().toISOString() }, null, 2));
if (results.some(x => x.status === 'failed')) process.exit(2);
