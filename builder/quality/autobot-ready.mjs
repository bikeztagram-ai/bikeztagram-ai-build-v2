#!/usr/bin/env node
/** Final deterministic readiness report; never approves merge/deploy. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const required = [
  'builder/runner/repository-index.mjs',
  'builder/runner/repository-aware-feature-brain.mjs',
  'builder/runner/repository-aware-executor.mjs',
  'builder/runner/deterministic-executor.mjs',
  'builder/runner/long-run-executor.mjs',
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
  'builder/monitor/heartbeat-watchdog.mjs',
  'scripts/autobot/verify-autobot-continuous-loop.mjs'
];
const missing = required.filter((f) => !fs.existsSync(f));
const checks = [];
const check = (label, file) => { try { execFileSync('node', ['--check', file], { stdio: 'ignore' }); checks.push([label, 'passed']); } catch { checks.push([label, 'failed']); } };
check('repository-aware executor syntax', 'builder/runner/repository-aware-executor.mjs');
check('repository-aware feature brain syntax', 'builder/runner/repository-aware-feature-brain.mjs');
check('deterministic executor syntax', 'builder/runner/deterministic-executor.mjs');
let continuous = 'failed';
try { execFileSync('node', ['scripts/autobot/verify-autobot-continuous-loop.mjs'], { stdio: 'ignore' }); continuous = 'passed'; } catch {}
const source = fs.readFileSync('builder/runner/repository-aware-feature-brain.mjs', 'utf8');
const runtime = fs.readFileSync('builder/runner/repository-aware-executor.mjs', 'utf8');
if (!/repository-aware-agent-v7/.test(source)) checks.push(['canonical protocol', 'failed']);
else checks.push(['canonical protocol', 'passed']);
if (!/qwen3:4b-instruct-2507-q4_K_M/.test(source + runtime)) checks.push(['Qwen3 4B default', 'failed']);
else checks.push(['Qwen3 4B default', 'passed']);
const syntax = checks.every(([, value]) => value === 'passed');
const result = {
  version: 3,
  status: missing.length || !syntax || continuous !== 'passed' ? 'not-ready' : 'ready-for-live-run',
  requiredComponents: required.length,
  missing,
  checks,
  continuousLoopContract: continuous,
  merge: 'human-review-only',
  deployment: 'human-review-only',
  geminiRequired: false,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync('builder/quality/autobot-readiness.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'ready-for-live-run') process.exit(2);
