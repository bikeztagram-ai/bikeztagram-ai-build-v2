#!/usr/bin/env node
/**
 * Runs the builder's quality gates in a fixed order. A later gate never runs
 * when an earlier gate fails, and no gate can merge or deploy.
 */
import { execFileSync } from 'node:child_process';

const commands = [
  ['regression', 'node builder/quality/regression-gate.mjs'],
  ['acceptance', 'node builder/quality/acceptance-gate.mjs'],
  ['scope', 'node builder/quality/change-scope.mjs'],
  ['merge-readiness', 'node builder/quality/merge-readiness.mjs']
];
const results = [];
for (const [name, command] of commands) {
  const [bin, ...args] = command.split(/\s+/);
  const startedAt = Date.now();
  try {
    execFileSync(bin, args, { stdio: 'inherit', env: process.env });
    results.push({ name, status: 'passed', durationMs: Date.now() - startedAt });
  } catch (error) {
    results.push({ name, status: 'failed', durationMs: Date.now() - startedAt, exitCode: error.status ?? null });
    console.error(`QUALITY GATE FAILED: ${name}`);
    console.log(JSON.stringify({ status: 'not-ready', results }, null, 2));
    process.exit(2);
  }
}
console.log(JSON.stringify({ status: 'ready-for-human-review', results }, null, 2));
