#!/usr/bin/env node
/**
 * Regression test for the failure mode where a syntax-invalid Qwen edit leaked
 * into the next agent turn. Exercises the runtime hardener against a fixture and
 * verifies the active brain contains the transactional edit contract.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const hardenerPath = path.join(root, 'scripts/autobot/fast-brain-runtime-hardening.mjs');
const active = fs.readFileSync(brainPath, 'utf8');
const failures = [];

function requireMarker(condition, message) {
  if (!condition) failures.push(message);
}

const rollbackIndex = active.indexOf('edit rejected and rolled back');
const writeIndex = active.indexOf('fs.writeFileSync(abs(file), next);');
const syntaxIndex = active.indexOf('const syntax = syntaxCheck(file);', writeIndex);
const restoreIndex = active.indexOf('fs.writeFileSync(abs(file), current);', syntaxIndex);
requireMarker(rollbackIndex >= 0, 'active brain is missing the edit rollback marker');
requireMarker(writeIndex >= 0 && syntaxIndex > writeIndex && restoreIndex > syntaxIndex && rollbackIndex > restoreIndex, 'rollback must occur after writing next and failing syntax, before returning the error');
requireMarker(active.includes("return `EDIT APPLIED: ${file}`;"), 'successful edit return contract missing');
requireMarker(active.includes('completed: completedIds'), 'durable completed-objective state missing');
requireMarker(active.includes('progress[objective.id] = 1'), 'submit completion tracking missing');
requireMarker(active.includes('(progress[o.id] || 0) < 1'), 'completed objectives are not excluded from selection');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bikeztagram-fast-brain-'));
try {
  fs.mkdirSync(path.join(temp, 'builder/runner'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'builder/brain'), { recursive: true });
  const fixture = `function editFile(file, search, replacement) {\n  const current = read(file);\n  const next = current.replace(search, replacement);\n  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') return \`${'${syntax}'}; repair this edit before continuing.\`;\n  return \`EDIT APPLIED: ${'${file}'}\`;\n}\nfunction saveState() {\n  fs.mkdirSync(path.dirname(statePath), { recursive: true });\n  fs.writeFileSync(statePath, JSON.stringify({ version: 14, completed: [], progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\\n');\n}\nconst available = objectives.filter((o) => dependenciesMet(o) && ((attempts.get(o.id) || 0) < maxAttempts));\nif (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 700); result = 'SUBMIT RECEIVED'; }\n`;
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
