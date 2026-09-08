#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { appendAudit, verifyAuditLog } from '../quality/audit-log.mjs';

const root = process.cwd();
const minutes = +(process.env.BUILDER_MAX_MINUTES || 15);
const units = +(process.env.BUILDER_MAX_UNITS || 1000);
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const stateFile = path.join(root, 'builder/working/deterministic-autobot.json');
const run = (file, env = {}) => {
  const r = spawnSync(process.execPath, [file], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  return r.error ? 1 : (r.status ?? 1);
};

let verified = 0;
let features = 0;
let failures = 0;

function index() {
  return run('builder/runner/repository-index.mjs');
}

function hardenRuntime() {
  return run('scripts/autobot/fast-brain-runtime-hardening.mjs');
}

function rollbackRegression() {
  return run('scripts/autobot/verify-fast-brain-rollback.mjs');
}

function deterministic() {
  const r = run('builder/runner/deterministic-executor.mjs', {
    BUILDER_MAX_MINUTES: String(Math.max(1, Math.min(4, Math.floor(left())))),
    BUILDER_MAX_UNITS: String(Math.max(1, units - verified)),
  });
  try {
    const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    verified += (s.verifiedThisRun || []).length;
  } catch {}
  return r;
}

function qwenAgent() {
  features += 1;
  return run('builder/runner/repository-aware-feature-brain.mjs', {
    BUILDER_MAX_MINUTES: String(Math.max(1, Math.min(10, Math.floor(left())))),
    AUTOBOT_FEATURE_MAX_ATTEMPTS: '1',
    AUTOBOT_FEATURE_MAX_EDITS: '3',
    AUTOBOT_AGENT_TURNS: '8',
    LOCAL_AI_MODEL: process.env.LOCAL_AI_MODEL || 'qwen3:4b-instruct-2507-q4_K_M',
  });
}

fs.mkdirSync(path.join(root, 'builder/working'), { recursive: true });
if (index() !== 0) process.exit(2);
if (hardenRuntime() !== 0) {
  console.error('[autobot] fast brain runtime hardening failed; stopping safely');
  process.exit(2);
}
if (rollbackRegression() !== 0) {
  console.error('[autobot] fast brain rollback regression failed; refusing to run Qwen unprotected');
  process.exit(2);
}
appendAudit('repository-aware-fast-run-started', {
  minutes,
  units,
  mode: 'repository-aware-agent-v7',
});

while (left() > 1 && verified < units) {
  const d = deterministic();
  if (d !== 0) failures += 1;
  if (left() <= 1) break;

  const f = qwenAgent();
  if (f !== 0) failures += 1;
  if (left() <= 1) break;

  const refreshed = index();
  if (refreshed !== 0) {
    failures += 1;
    console.error('[autobot] repository index refresh failed after Qwen agent slice; stopping safely');
    break;
  }
  if (d !== 0 && f !== 0) break;
}

const summary = {
  verified,
  features,
  failures,
  elapsedMinutes: Number(((Date.now() - started) / 60000).toFixed(2)),
  mode: 'repository-aware-agent-v7',
};
appendAudit('repository-aware-fast-run-finished', summary);
const audit = verifyAuditLog();
if (!audit.valid) process.exit(3);
console.log(`[autobot] fast executor finished: ${JSON.stringify(summary)}`);
