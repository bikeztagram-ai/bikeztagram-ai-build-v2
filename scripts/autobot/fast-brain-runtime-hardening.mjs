#!/usr/bin/env node
/**
 * Runtime hardening for the local Qwen feature brain.
 * Applies idempotent safety/progress repairs before each agent slice.
 * Fail closed if a required runtime marker cannot be found.
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

if (!source.includes('edit rejected and rolled back')) {
  const before = "  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') return `${syntax}; repair this edit before continuing.`;\n  return `EDIT APPLIED: ${file}`;\n";
  const after = "  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') {\n    fs.writeFileSync(abs(file), current);\n    return `ERROR: edit rejected and rolled back; ${syntax}. The file is restored to its pre-edit state. Do NOT retry the same replacement. Choose a different objective file or a much smaller syntactically complete replacement.`;\n  }\n  return `EDIT APPLIED: ${file}`;\n";
  if (!replaceExact('feature-brain edit-level syntax rollback', before, after)) throw new Error('feature-brain edit guard marker not found; refusing unprotected run');
}

if (!source.includes('completed: completedIds')) {
  const before = "function saveState() {\n  fs.mkdirSync(path.dirname(statePath), { recursive: true });\n  fs.writeFileSync(statePath, JSON.stringify({ version: 14, completed: [], progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\\n');\n}";
  const after = "function saveState() {\n  fs.mkdirSync(path.dirname(statePath), { recursive: true });\n  const completedIds = objectives.filter((objective) => (progress[objective.id] || 0) >= 1).map((objective) => objective.id);\n  fs.writeFileSync(statePath, JSON.stringify({ version: 15, completed: completedIds, progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\\n');\n}";
  if (!replaceExact('feature-brain durable completed-objective state', before, after)) throw new Error('feature-brain saveState marker not found; refusing incomplete progress patch');
}

if (!source.includes('progress[objective.id] = 1')) {
  const before = "if (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 700); result = 'SUBMIT RECEIVED'; }";
  const after = "if (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 700); progress[objective.id] = 1; saveState(); result = 'SUBMIT RECEIVED: objective marked complete'; }";
  if (!replaceExact('feature-brain submit completion tracking', before, after)) throw new Error('feature-brain submit marker not found; refusing incomplete progress patch');
}

if (!source.includes('failed objective retry ceiling')) {
  const before = "  const available = objectives.filter((o) => dependenciesMet(o) && (attempts.get(o.id) || 0) < maxAttempts);";
  const after = "  const available = objectives.filter((o) => dependenciesMet(o) && (progress[o.id] || 0) < 1 && (state.failed?.[o.id]?.attempts || 0) < 2 && (attempts.get(o.id) || 0) < maxAttempts);\n  // failed objective retry ceiling: rotate to a different objective after repeated failures\n";
  if (!replaceExact('feature-brain failed objective retry ceiling', before, after)) throw new Error('feature-brain objective selector marker not found; refusing incomplete rotation patch');
}

// Give Qwen enough surrounding syntax to understand function boundaries. Small
// requested windows are expanded to at least 70 lines while remaining bounded.
if (!source.includes('const requestedEnd = Number(end) || 0;')) {
  const before = "  const last = Math.min(lines.length, first + 89, Number(end) || first + 89);";
  const after = "  const requestedEnd = Number(end) || 0;\n  const boundedEnd = requestedEnd > first ? Math.max(requestedEnd, first + 69) : first + 89;\n  const last = Math.min(lines.length, first + 89, boundedEnd);";
  if (!replaceExact('feature-brain minimum inspection window', before, after)) throw new Error('feature-brain read window marker not found; refusing incomplete context patch');
}

if (!source.includes('failedEditFiles')) {
  const before = "  let editCount = 0; let submitted = false; let summary = ''; let inspected = false; let emptyTurns = 0;";
  const after = "  let editCount = 0; let submitted = false; let summary = ''; let inspected = false; let emptyTurns = 0; let failedEditAttempts = 0; const failedEditFiles = new Set();";
  if (!replaceExact('feature-brain failed-edit strategy state', before, after)) throw new Error('feature-brain execution state marker not found; refusing incomplete strategy patch');
}

if (!source.includes('same file is blocked for this attempt')) {
  const before = "        else { result = editFile(call.args.file, call.args.search, call.args.replace, objective); if (result.startsWith('EDIT APPLIED')) editCount += 1; }";
  const after = "        else if (failedEditFiles.has(String(call.args.file || ''))) result = 'ERROR: same file is blocked for this attempt after a failed edit. Choose another objective file.';\n        else { result = editFile(call.args.file, call.args.search, call.args.replace, objective); if (result.startsWith('EDIT APPLIED')) editCount += 1; else { failedEditAttempts += 1; failedEditFiles.add(String(call.args.file || '')); } }";
  if (!replaceExact('feature-brain failed-file guard', before, after)) throw new Error('feature-brain edit dispatch marker not found; refusing incomplete strategy patch');
}

if (!source.includes('A previous edit failed. Do not retry that file.')) {
  const before = "      } else if (call.name === 'read_file') {\n        messages.push({ role: 'user', content: 'Inspection complete. Do not read more files. Your next response MUST be edit_file with the smallest meaningful accepted improvement.' });";
  const after = "      } else if (call.name === 'read_file') {\n        messages.push({ role: 'user', content: failedEditAttempts > 0 ? 'Inspection complete. A previous edit failed. Do not retry that file. Your next response MUST be edit_file on a DIFFERENT objective file with the smallest meaningful syntactically complete change.' : 'Inspection complete. Do not read more files. Your next response MUST be edit_file with the smallest meaningful accepted improvement.' });";
  if (!replaceExact('feature-brain inspection strategy steering', before, after)) throw new Error('feature-brain read steering marker not found; refusing incomplete strategy patch');
}

if (!source.includes('Do NOT repeat the same replacement.')) {
  const before = "      if (call.name === 'edit_file' && result.startsWith('EDIT APPLIED')) {\n        messages.push({ role: 'user', content: 'EDIT APPLIED. Now verify it: call run_check with build or diff-check. Do not make another edit until verification is known.' });\n      } else if (call.name === 'read_file') {";
  const after = "      if (call.name === 'edit_file' && result.startsWith('EDIT APPLIED')) {\n        messages.push({ role: 'user', content: 'EDIT APPLIED. Now verify it: call run_check with build or diff-check. Do not make another edit until verification is known.' });\n      } else if (call.name === 'edit_file' && result.startsWith('ERROR')) {\n        if (failedEditAttempts >= 2) {\n          const previous = state.failed?.[objective.id]?.attempts || 0;\n          state.failed = { ...(state.failed || {}), [objective.id]: { attempts: previous + 1, lastError: result.slice(0, 1200), updatedAt: new Date().toISOString() } };\n          saveState();\n        }\n        messages.push({ role: 'user', content: failedEditAttempts > 1 ? 'Two edit attempts have failed. STOP working on the current file. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' : 'Edit failed. Do NOT repeat the same replacement or edit the failed file again. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' });\n      } else if (call.name === 'read_file') {";
  if (!replaceExact('feature-brain failed-edit feedback steering', before, after)) throw new Error('feature-brain edit feedback marker not found; refusing incomplete strategy patch');
}

if (changed) fs.writeFileSync(brainPath, source);

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
  ['failed objective retry ceiling', 'failed-objective rotation marker'],
  ['const requestedEnd = Number(end) || 0;', 'minimum inspection window marker'],
  ['failedEditFiles', 'failed-file strategy state'],
  ['same file is blocked for this attempt', 'failed-file guard'],
  ['A previous edit failed. Do not retry that file.', 'inspection strategy steering'],
  ['Do NOT repeat the same replacement.', 'failed-edit feedback steering'],
]) {
  if (!finalBrain.includes(marker)) throw new Error(`required ${message} missing after hardening`);
}
console.log('[autobot] Qwen runtime hardening PASS: transactional edits + durable completion + objective rotation + larger inspection windows + failed-edit strategy shift.');
