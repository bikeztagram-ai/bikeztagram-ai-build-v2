#!/usr/bin/env node
/**
 * Runtime hardening for the local Qwen feature brain.
 * Applies idempotent safety/progress repairs before each agent slice.
 *
 * Fail closed if a required runtime marker cannot be found, so an unprotected
 * brain is never allowed to run accidentally.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const taskPath = path.join(root, 'builder/brain/task-library.json');
let source = fs.readFileSync(brainPath, 'utf8');
let changed = false;

function replaceExact(label, before, after) {
  if (!source.includes(before)) return false;
  source = source.replace(before, after);
  changed = true;
  console.log(`[autobot] ${label} repaired.`);
  return true;
}

// Transactional edit guard: syntax-invalid Qwen edits are immediately rolled
// back so the next turn never inherits a broken workspace.
if (!source.includes('edit rejected and rolled back')) {
  const before = "  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') return `${syntax}; repair this edit before continuing.`;\n  return `EDIT APPLIED: ${file}`;\n";
  const after = "  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') {\n    fs.writeFileSync(abs(file), current);\n    return `ERROR: edit rejected and rolled back; ${syntax}. The file is restored to its pre-edit state. Choose a smaller, syntactically complete replacement.`;\n  }\n  return `EDIT APPLIED: ${file}`;\n";
  if (!replaceExact('feature-brain edit-level syntax rollback', before, after)) {
    throw new Error('feature-brain edit guard marker not found; refusing unprotected run');
  }
}

// Durable completion state: preserve completed objective IDs between runs.
if (!source.includes('completed: completedIds')) {
  const before = "function saveState() {\n  fs.mkdirSync(path.dirname(statePath), { recursive: true });\n  fs.writeFileSync(statePath, JSON.stringify({ version: 14, completed: [], progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\\n');\n}";
  const after = "function saveState() {\n  fs.mkdirSync(path.dirname(statePath), { recursive: true });\n  const completedIds = objectives.filter((objective) => (progress[objective.id] || 0) >= 1).map((objective) => objective.id);\n  fs.writeFileSync(statePath, JSON.stringify({ version: 15, completed: completedIds, progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\\n');\n}";
  if (!replaceExact('feature-brain durable completed-objective state', before, after)) {
    throw new Error('feature-brain saveState marker not found; refusing incomplete progress patch');
  }
}

// Successful submission completes the objective immediately, preventing the
// same run from recycling the same high-priority objective.
if (!source.includes('progress[objective.id] = 1')) {
  const before = "if (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 700); result = 'SUBMIT RECEIVED'; }";
  const after = "if (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 700); progress[objective.id] = 1; saveState(); result = 'SUBMIT RECEIVED: objective marked complete'; }";
  if (!replaceExact('feature-brain submit completion tracking', before, after)) {
    throw new Error('feature-brain submit marker not found; refusing incomplete progress patch');
  }
}

// Completed objectives are never selected again within the same run.
if (!source.includes('(progress[o.id] || 0) < 1')) {
  const before = "  const available = objectives.filter((o) => dependenciesMet(o) && (attempts.get(o.id) || 0) < maxAttempts);";
  const after = "  const available = objectives.filter((o) => dependenciesMet(o) && (progress[o.id] || 0) < 1 && (attempts.get(o.id) || 0) < maxAttempts);";
  if (!replaceExact('feature-brain completed-objective exclusion', before, after)) {
    throw new Error('feature-brain objective selection marker not found; refusing incomplete routing patch');
  }
}

if (changed) fs.writeFileSync(brainPath, source);

// Repair the stale export acceptance command if it exists in the generated
// task library. This is idempotent.
let tasks = fs.readFileSync(taskPath, 'utf8');
if (tasks.includes('npm run verify:batch33')) {
  tasks = tasks.replaceAll('npm run verify:batch33', 'node scripts/autobot/export-contract-check.mjs');
  fs.writeFileSync(taskPath, tasks);
  console.log('[autobot] stale export verification command repaired.');
}

const finalBrain = fs.readFileSync(brainPath, 'utf8');
for (const [marker, message] of [
  ['edit rejected and rolled back', 'edit rollback marker'],
  ['completed: completedIds', 'durable completion marker'],
  ['progress[objective.id] = 1', 'submit completion marker'],
  ['(progress[o.id] || 0) < 1', 'completed-objective exclusion marker'],
]) {
  if (!finalBrain.includes(marker)) throw new Error(`required ${message} missing after hardening`);
}
console.log('[autobot] Qwen runtime hardening PASS: transactional edits + durable objective completion.');
