#!/usr/bin/env node
/** Regression test for Qwen edit rollback and durable objective routing hardening. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const hardenerPath = path.join(root, 'scripts/autobot/fast-brain-runtime-hardening.mjs');
const active = fs.readFileSync(path.join(root, 'builder/runner/repository-aware-feature-brain.mjs'), 'utf8');
const hardener = fs.readFileSync(hardenerPath, 'utf8');
const failures = [];
const requireMarker = (condition, message) => { if (!condition) failures.push(message); };

requireMarker(active.includes('fs.writeFileSync(abs(file), next);'), 'active brain edit path missing');
requireMarker(active.includes('const syntax = syntaxCheck(file);'), 'active brain syntax check missing');
requireMarker(hardener.includes('edit rejected and rolled back'), 'runtime hardener missing transactional rollback');
requireMarker(hardener.includes('completed: completedIds'), 'runtime hardener missing durable completed-objective state');
requireMarker(hardener.includes('progress[objective.id] = 1'), 'runtime hardener missing submit completion tracking');
requireMarker(hardener.includes('(progress[o.id] || 0) < 1'), 'runtime hardener missing completed-objective exclusion');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bikeztagram-fast-brain-'));
try {
  fs.mkdirSync(path.join(temp, 'builder/runner'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'builder/brain'), { recursive: true });
  const fixture = `function editFile(file, search, replacement) {\n  const current = read(file);\n  const next = current.replace(search, replacement);\n  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') return \`${'${syntax}'}; repair this edit before continuing.\`;\n  return \`EDIT APPLIED: ${'${file}'}\`;\n}\nfunction saveState() {\n  fs.mkdirSync(path.dirname(statePath), { recursive: true });\n  fs.writeFileSync(statePath, JSON.stringify({ version: 14, completed: [], progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\\n');\n}\nfunction chooseObjective() {\n  const available = objectives.filter((o) => dependenciesMet(o) && (attempts.get(o.id) || 0) < maxAttempts);\n  return available[0] || null;\n}\nif (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 700); result = 'SUBMIT RECEIVED'; }\n`;
  fs.writeFileSync(path.join(temp, 'builder/runner/repository-aware-feature-brain.mjs'), fixture);
  fs.writeFileSync(path.join(temp, 'builder/brain/task-library.json'), '{}\n');
  const result = spawnSync(process.execPath, [hardenerPath], {
    cwd: temp,
    encoding: 'utf8',
    env: { ...process.env, AUTOBOT_HARDENING_ROOT: temp },
  });
  requireMarker(result.status === 0, `runtime hardener fixture failed: ${result.stderr || result.stdout}`);
  const hardened = fs.readFileSync(path.join(temp, 'builder/runner/repository-aware-feature-brain.mjs'), 'utf8');
  requireMarker(hardened.includes('edit rejected and rolled back'), 'fixture hardening did not install transactional rollback');
  requireMarker(hardened.includes('completed: completedIds'), 'fixture hardening did not install durable completion state');
  requireMarker(hardened.includes('progress[objective.id] = 1'), 'fixture hardening did not install submit completion tracking');
  requireMarker(hardened.includes('(progress[o.id] || 0) < 1'), 'fixture hardening did not install completed-objective exclusion');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error('[autobot] fast-brain rollback regression FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] fast-brain rollback regression PASS');
