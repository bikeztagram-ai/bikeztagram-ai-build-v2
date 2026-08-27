#!/usr/bin/env node
/** Final deterministic readiness report; never approves merge/deploy. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const required = [
  'builder/runner/deterministic-executor.mjs',
  'builder/runner/run-duration.mjs',
  'builder/runner/recovery-controller.mjs',
  'builder/runner/segment-plan.mjs',
  'builder/runner/retry-policy.mjs',
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
const missing = required.filter(f => !fs.existsSync(f));
let syntax = 'failed';
try { execFileSync('node', ['--check', 'builder/runner/deterministic-executor.mjs'], { stdio: 'ignore' }); syntax = 'passed'; } catch {}
const result = {
  version: 1,
  status: missing.length || syntax !== 'passed' ? 'not-ready' : 'ready-for-live-run',
  requiredComponents: required.length,
  missing,
  executorSyntax: syntax,
  merge: 'human-review-only',
  deployment: 'human-review-only',
  geminiRequired: false,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync('builder/quality/autobot-readiness.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'ready-for-live-run') process.exit(2);
