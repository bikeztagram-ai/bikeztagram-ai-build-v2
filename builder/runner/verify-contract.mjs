#!/usr/bin/env node
/** Verify required AutoBot control components exist before a run. */
import fs from 'node:fs';

const required = [
  'builder/runner/deterministic-executor.mjs',
  'builder/runner/run-duration.mjs',
  'builder/runner/retry-policy.mjs',
  'builder/runner/recovery-controller.mjs',
  'builder/runner/segment-plan.mjs',
  'builder/quality/gate-runner.mjs',
  'builder/quality/merge-readiness.mjs',
  'builder/quality/acceptance-gate.mjs',
  'builder/quality/regression-gate.mjs',
  'builder/learning/record-outcome.mjs',
  'builder/learning/analyse-patterns.mjs',
  'builder/learning/improvement-proposal.mjs',
  'builder/learning/lesson-validator.mjs',
  'builder/monitor/heartbeat-watchdog.mjs'
];
const missing = required.filter(file => !fs.existsSync(file));
const result = { status: missing.length ? 'contract-incomplete' : 'contract-valid', required: required.length, missing, generatedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
if (missing.length) process.exit(2);
