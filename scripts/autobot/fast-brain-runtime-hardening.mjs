#!/usr/bin/env node
/**
 * Runtime hardening for the local Qwen feature brain.
 * Applies idempotent safety/progress repairs before each agent slice.
 *
 * This is intentionally fail-closed: if a required runtime marker cannot be
 * found, the run stops instead of silently running an unprotected brain.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const taskPath = path.join(root, 'builder/brain/task-library.json');
const brain = fs.readFileSync(brainPath, 'utf8');
let source = brain;
let changed = false;

function replaceOnce(label, matcher, replacement) {
  if (matcher.test(source)) {
    source = source.replace(matcher, replacement);
    changed = true;
    console.log(`[autobot] ${label} repaired.`);
    return true;
  }
  return false;
}

// The edit path must be transactional: a syntax-invalid replacement can never
// remain in the workspace for the next Qwen turn.
if (!source.includes('edit rejected and rolled back')) {
  const rollbackPatched = replaceOnce(
    'feature-brain edit-level syntax rollback',
    /  fs\.writeFileSync\(abs\(file\), next\);\n  const syntax = syntaxCheck\(file\);\n  if \(syntax !== 'PASS'\) return `\$\{syntax\}; repair this edit before continuing\.`;\n  return `EDIT APPLIED: \$\{file\}`;\n/,
    "  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') {\n    fs.writeFileSync(abs(file), current);\n    return `ERROR: edit rejected and rolled back; ${syntax}. The file is restored to its pre-edit state. Choose a smaller, syntactically complete replacement.`;\n  }\n  return `EDIT APPLIED: ${file}`;\n"
  );
  if (!rollbackPatched) throw new Error('feature-brain edit guard marker not found; refusing unprotected run');
}

// Durable completion must survive the next process. The old implementation
// wrote completed: [] on every save, which made already-finished objectives
// eligible again and caused repeated work.
if (!source.includes('completed: completedIds')) {
  const completionPatched = replaceOnce(
    'feature-brain durable completed-objective state',
    /function saveState\(\) \{\n  fs\.mkdirSync\(path\.dirname\(statePath\), \{ recursive: true \}\);\n  fs\.writeFileSync\(statePath, JSON\.stringify\(\{ version: 14, completed: \[\], progress, failed: state\.failed \|\| \{\}, updatedAt: new Date\(\)\.toISOString\(\) \}, null, 2\) \+ '\\n'\);\n\}/,
    "function saveState() {\n  fs.mkdirSync(path.dirname(statePath), { recursive: true });\n  const completedIds = objectives.filter((objective) => (progress[objective.id] || 0) >= 1).map((objective) => objective.id);\n  fs.writeFileSync(statePath, JSON.stringify({ version: 15, completed: completedIds, progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\\n');\n}"
  );
  if (!completionPatched) throw new Error('feature-brain saveState marker not found; refusing blind progress patch');
}

// Once submitted and verified, mark that objective complete immediately. This
// makes objective selection progress-aware instead of repeatedly selecting the
// same high-priority slice in the same run.
if (!source.includes('progress[objective.id] = 1')) {
  const submitPatched = replaceOnce(
    'feature-brain submit completion tracking',
    /if \(call\.name === 'submit'\) \{ submitted = true; summary = String\(call\.args\.summary \|\| ''\)\.slice\(0, 700\); result = 'SUBMIT RECEIVED'; \}/,
    "if (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 700); progress[objective.id] = 1; saveState(); result = 'SUBMIT RECEIVED: objective marked complete'; }"
  );
  if (!submitPatched) throw new Error('feature-brain submit marker not found; refusing incomplete progress patch');
}

// Selection should never knowingly pick an objective already complete. This is
// stronger than a priority penalty and prevents same-run recycling.
if (!source.includes('(progress[o.id] || 0) < 1')) {
  const selectionPatched = replaceOnce(
    'feature-brain completed-objective exclusion',
    /const available = objectives\.filter\(\(o\) => dependenciesMet\(o\) && \(\(attempts\.get\(o\.id\) \|\| 0\) < maxAttempts\)\);/,
    "const available = objectives.filter((o) => dependenciesMet(o) && (progress[o.id] || 0) < 1 && (attempts.get(o.id) || 0) < maxAttempts);"
  );
  if (!selectionPatched) throw new Error('feature-brain objective selection marker not found; refusing incomplete routing patch');
}

if (changed) fs.writeFileSync(brainPath, source);

// Repair the stale export acceptance command if it is present in the generated
// task library. Keep this idempotent so repeated runs are harmless.
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
