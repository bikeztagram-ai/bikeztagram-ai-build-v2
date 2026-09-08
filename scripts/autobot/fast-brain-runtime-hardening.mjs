#!/usr/bin/env node
/** Runtime hardening for the local Qwen feature brain. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const taskPath = path.join(root, 'builder/brain/task-library.json');
let source = fs.readFileSync(brainPath, 'utf8');
let changed = false;

function patch(label, pattern, replacement) {
  if (!pattern.test(source)) return false;
  source = source.replace(pattern, replacement);
  changed = true;
  console.log(`[autobot] ${label} repaired.`);
  return true;
}

// Syntax-invalid edits are transactional: restore the exact pre-edit source.
if (!source.includes('edit rejected and rolled back')) {
  if (!patch('feature-brain edit-level syntax rollback', /fs\.writeFileSync\(abs\(file\), next\);\s*const syntax = syntaxCheck\(file\);\s*if \(syntax !== 'PASS'\) return `\$\{syntax\}; repair this edit before continuing\.`;\s*return `EDIT APPLIED: \$\{file\}`;/,
`fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') {\n    fs.writeFileSync(abs(file), current);\n    return \`ERROR: edit rejected and rolled back; \${syntax}. The file is restored to its pre-edit state. Do NOT retry the same replacement. Choose a different objective file or a much smaller syntactically complete replacement.\`;\n  }\n  return \`EDIT APPLIED: \${file}\`;`)) throw new Error('feature-brain edit guard marker not found; refusing unprotected run');
}

// Persist completed objectives so later runs do not recycle submitted work.
if (!source.includes('completed: completedIds')) {
  if (!patch('feature-brain durable completed-objective state', /function saveState\(\) \{[\s\S]*?JSON\.stringify\(\{ version:\s*14,\s*completed:\s*\[\],\s*progress,\s*failed:\s*state\.failed \|\| \{\},\s*updatedAt:\s*new Date\(\)\.toISOString\(\) \}, null, 2\) \+ '\\\\n'\);\s*\}/,
`function saveState() {\n  fs.mkdirSync(path.dirname(statePath), { recursive: true });\n  const completedIds = objectives.filter((objective) => (progress[objective.id] || 0) >= 1).map((objective) => objective.id);\n  fs.writeFileSync(statePath, JSON.stringify({ version: 15, completed: completedIds, progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\\n');\n}`)) throw new Error('feature-brain saveState marker not found; refusing incomplete progress patch');
}

if (!source.includes('progress[objective.id] = 1')) {
  if (!patch('feature-brain submit completion tracking', /if \(call\.name === 'submit'\) \{\s*submitted = true;\s*summary = String\(call\.args\.summary \|\| ''\)\.slice\(0, 700\);\s*result = 'SUBMIT RECEIVED';\s*\}/,
`if (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 700); progress[objective.id] = 1; saveState(); result = 'SUBMIT RECEIVED: objective marked complete'; }`)) throw new Error('feature-brain submit marker not found; refusing incomplete progress patch');
}

if (!source.includes('failed objective retry ceiling')) {
  if (!patch('feature-brain failed objective retry ceiling', /const available = objectives\.filter\(\(o\) => dependenciesMet\(o\) && \(attempts\.get\(o\.id\) \|\| 0\) < maxAttempts\);/,
`const available = objectives.filter((o) => dependenciesMet(o) && (progress[o.id] || 0) < 1 && (state.failed?.[o.id]?.attempts || 0) < 2 && (attempts.get(o.id) || 0) < maxAttempts);\n  // failed objective retry ceiling: rotate to a different objective after repeated failures`)) throw new Error('feature-brain objective selector marker not found; refusing incomplete rotation patch');
}

if (!source.includes('const requestedEnd = Number(end) || 0;')) {
  if (!patch('feature-brain minimum inspection window', /const last = Math\.min\(lines\.length, first \+ 89, Number\(end\) \|\| first \+ 89\);/,
`const requestedEnd = Number(end) || 0;\n  const boundedEnd = requestedEnd > first ? Math.max(requestedEnd, first + 69) : first + 89;\n  const last = Math.min(lines.length, first + 89, boundedEnd);`)) throw new Error('feature-brain read window marker not found; refusing incomplete context patch');
}

if (!source.includes('failedEditFiles')) {
  if (!patch('feature-brain failed-edit strategy state', /let editCount = 0; let submitted = false; let summary = ''; let inspected = false; let emptyTurns = 0;/,
`let editCount = 0; let submitted = false; let summary = ''; let inspected = false; let emptyTurns = 0; let failedEditAttempts = 0; const failedEditFiles = new Set();`)) throw new Error('feature-brain execution state marker not found; refusing incomplete strategy patch');
}

if (!source.includes('same file is blocked for this attempt')) {
  const dispatch = /else\s*\{\s*result = editFile\(call\.args\.file, call\.args\.search, call\.args\.replace, objective\);\s*if \(result\.startsWith\('EDIT APPLIED'\)\) editCount \+= 1;\s*\}/;
  if (!patch('feature-brain failed-file guard', dispatch,
`else if (failedEditFiles.has(String(call.args.file || ''))) result = 'ERROR: same file is blocked for this attempt after a failed edit. Choose another objective file.';\n        else { result = editFile(call.args.file, call.args.search, call.args.replace, objective); if (result.startsWith('EDIT APPLIED')) editCount += 1; else { failedEditAttempts += 1; failedEditFiles.add(String(call.args.file || '')); } }`)) throw new Error('feature-brain edit dispatch marker not found; refusing incomplete strategy patch');
}

if (!source.includes('A previous edit failed. Do not retry that file.')) {
  const readSteering = /else if \(call\.name === 'read_file'\) \{\s*messages\.push\(\{ role: 'user', content: 'Inspection complete\. Do not read more files\. Your next response MUST be edit_file with the smallest meaningful accepted improvement\.' \}\);/;
  if (!patch('feature-brain inspection strategy steering', readSteering,
`else if (call.name === 'read_file') {\n        messages.push({ role: 'user', content: failedEditAttempts > 0 ? 'Inspection complete. A previous edit failed. Do not retry that file. Your next response MUST be edit_file on a DIFFERENT objective file with the smallest meaningful syntactically complete change.' : 'Inspection complete. Do not read more files. Your next response MUST be edit_file with the smallest meaningful accepted improvement.' });`)) throw new Error('feature-brain read steering marker not found; refusing incomplete strategy patch');
}

if (!source.includes('Do NOT repeat the same replacement.')) {
  const feedback = /if \(call\.name === 'edit_file' && result\.startsWith\('EDIT APPLIED'\)\) \{[\s\S]*?\n\s*\} else if \(call\.name === 'read_file'\) \{/;
  if (!patch('feature-brain failed-edit feedback steering', feedback,
`if (call.name === 'edit_file' && result.startsWith('EDIT APPLIED')) {\n        messages.push({ role: 'user', content: 'EDIT APPLIED. Now verify it: call run_check with build or diff-check. Do not make another edit until verification is known.' });\n      } else if (call.name === 'edit_file' && result.startsWith('ERROR')) {\n        if (failedEditAttempts >= 2) {\n          const previous = state.failed?.[objective.id]?.attempts || 0;\n          state.failed = { ...(state.failed || {}), [objective.id]: { attempts: previous + 1, lastError: result.slice(0, 1200), updatedAt: new Date().toISOString() } };\n          saveState();\n        }\n        messages.push({ role: 'user', content: failedEditAttempts > 1 ? 'Two edit attempts have failed. STOP working on the current file. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' : 'Edit failed. Do NOT repeat the same replacement or edit the failed file again. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' });\n      } else if (call.name === 'read_file') {`)) throw new Error('feature-brain edit feedback marker not found; refusing incomplete strategy patch');
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
]) if (!finalBrain.includes(marker)) throw new Error(`required ${message} missing after hardening`);
console.log('[autobot] Qwen runtime hardening PASS: transactional edits + durable completion + objective rotation + larger inspection windows + failed-edit strategy shift.');
