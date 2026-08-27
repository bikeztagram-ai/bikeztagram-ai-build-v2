#!/usr/bin/env node
/** Fail closed before a run if the core autonomous contract is incomplete. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const required = [
  'builder/runner/deterministic-executor.mjs',
  'builder/runner/run-duration.mjs',
  'builder/runner/retry-policy.mjs',
  'builder/runner/recovery-controller.mjs',
  'builder/runner/segment-plan.mjs',
  'builder/runner/safety-contract.json',
  'builder/quality/gate-runner.mjs',
  'builder/quality/merge-readiness.mjs',
  'builder/quality/acceptance-gate.mjs',
  'builder/quality/regression-gate.mjs',
  'builder/quality/review-manifest.mjs',
  'builder/learning/record-outcome.mjs',
  'builder/learning/analyse-patterns.mjs',
  'builder/learning/improvement-proposal.mjs',
  'builder/learning/lesson-validator.mjs',
  'builder/monitor/heartbeat-watchdog.mjs'
];
const missing = required.filter(file => !fs.existsSync(file));
let syntax = 'not-run';
if (!missing.length) {
  try { execFileSync('node', ['--check', 'builder/runner/deterministic-executor.mjs'], { stdio: 'ignore' }); syntax = 'passed'; }
  catch { syntax = 'failed'; }
}
const result = { status: missing.length || syntax !== 'passed' ? 'preflight-failed' : 'preflight-passed', required: required.length, missing, syntax, generatedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'preflight-passed') process.exit(2);
