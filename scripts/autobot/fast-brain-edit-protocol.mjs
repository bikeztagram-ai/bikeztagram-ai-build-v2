#!/usr/bin/env node
/**
 * Runtime edit-protocol hardening for the canonical Qwen3 4B feature brain.
 * Keeps the canonical model and safety gates unchanged while giving the model
 * a lower-risk additive edit mode and a deterministic re-inspection path.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const originalBrain = fs.readFileSync(brainPath, 'utf8');
let brain = originalBrain;

const editToolPattern = /\{ type: 'function', function: \{ name: 'edit_file',[\s\S]*?\} \} \},\n  \{ type: 'function', function: \{ name: 'run_check'/;
const hardenedEditTool = `{ type: 'function', function: { name: 'edit_file', description: 'Apply one safe product-source edit. Prefer mode=insert_after for additive changes: use a short unique existing anchor and add a small complete syntactic block. Use mode=replace only when replacing a small complete syntactic unit. Never replace an enclosing function unless you have read the complete function.', parameters: { type: 'object', required: ['file', 'search', 'replace'], properties: { file: { type: 'string' }, mode: { type: 'string', enum: ['replace', 'insert_after'], description: 'Use insert_after for the safest additive edit; use replace only for a small complete syntactic unit.' }, search: { type: 'string', description: 'For insert_after, a short unique existing anchor such as a function declaration or return statement; for replace, the exact unique old text.' }, replace: { type: 'string', description: 'For insert_after, only the new code to insert after the anchor; for replace, the complete replacement text.' } } } } },\n  { type: 'function', function: { name: 'run_check'`;
if (!editToolPattern.test(brain)) throw new Error('edit tool contract shape not recognized; refusing edit-protocol migration');
brain = brain.replace(editToolPattern, hardenedEditTool);

const insertionPoint = '\nconst tools = [';
const insertAfterFunction = `\nfunction insertAfter(file, anchor, addition, objective) {\n  file = String(file || '');\n  if (!allowedFile(file, objective) || !isSafeRepoFile(file)) return 'ERROR: out-of-scope or unsafe write.';\n  const current = read(file);\n  if (!current) return \`ERROR: file not found: \${file}\`;\n  if (!anchor || typeof addition !== 'string' || !addition.trim()) return 'ERROR: insert_after requires a non-empty anchor and code to insert.';\n  const matches = current.split(anchor).length - 1;\n  if (matches !== 1) return \`ERROR: insert_after anchor must match once; found \${matches}. Read a smaller unique anchor.\`;\n  const lines = addition.split(/\\r?\\n/).length;\n  if (lines > 24) return 'ERROR: insert_after block is too large; keep the additive change to 24 lines or fewer.';\n  const separator = anchor.endsWith('\\n') ? '' : '\\n';\n  const next = current.replace(anchor, anchor + separator + addition);\n  if (next === current || !next.trim()) return 'ERROR: no-op or empty edit refused.';\n  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') {\n    fs.writeFileSync(abs(file), current);\n    return \`ERROR: insert_after rejected and rolled back; \${syntax}. The file is restored to its pre-edit state. Re-read the affected area and choose a smaller complete block or a different anchor.\`;\n  }\n  return \`EDIT APPLIED: \${file}\`;\n}\n`;
if (!brain.includes('function insertAfter(file, anchor, addition, objective)')) {
  if (!brain.includes(insertionPoint)) throw new Error('tool insertion point not found; refusing edit-protocol migration');
  brain = brain.replace(insertionPoint, insertAfterFunction + insertionPoint);
}

const editCall = "result = editFile(call.args.file, call.args.search, call.args.replace, objective);";
const hardenedEditCall = "result = call.args.mode === 'insert_after' ? insertAfter(call.args.file, call.args.search, call.args.replace, objective) : editFile(call.args.file, call.args.search, call.args.replace, objective);";
if (brain.includes(editCall)) brain = brain.replace(editCall, hardenedEditCall);
else if (!brain.includes('call.args.mode === \'insert_after\'')) throw new Error('edit handler call not found; refusing edit-protocol migration');

const readHandler = "else if (call.name === 'read_file') { inspected = true; toolPhase = 'edit'; result = readFileWindow(call.args.file, call.args.start, call.args.end, objective); }";
const hardenedReadHandler = "else if (call.name === 'read_file') { inspected = true; failedEditFiles.delete(String(call.args.file || '')); toolPhase = 'edit'; result = readFileWindow(call.args.file, call.args.start, call.args.end, objective); }";
if (brain.includes(readHandler)) brain = brain.replace(readHandler, hardenedReadHandler);
else if (!brain.includes('failedEditFiles.delete(String(call.args.file || \'\'))')) throw new Error('read handler not found; refusing recovery migration');

const verifyFailurePhase = "else if (call.name === 'run_check') { result = runCheck(call.args.check); toolPhase = result === 'PASS' ? 'submit' : 'edit'; }";
const hardenedVerifyFailurePhase = "else if (call.name === 'run_check') { result = runCheck(call.args.check); toolPhase = result === 'PASS' ? 'submit' : 'inspect'; }";
if (brain.includes(verifyFailurePhase)) brain = brain.replace(verifyFailurePhase, hardenedVerifyFailurePhase);
else if (!brain.includes("toolPhase = result === 'PASS' ? 'submit' : 'inspect'")) throw new Error('verification phase handler not found; refusing recovery migration');

const failurePrompt = "messages.push({ role: 'user', content: failedEditAttempts > 1 ? 'Two edit attempts have failed. STOP working on the current file. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' : 'Edit failed. Do NOT repeat the same replacement or edit the failed file again. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' });";
const hardenedFailurePrompt = "messages.push({ role: 'user', content: failedEditAttempts > 1 ? 'Two edit attempts have failed. Re-inspect the affected code before editing. Your NEXT tool call MUST be read_file; after that use a different anchor or insert_after mode with the smallest complete syntactic change.' : 'Edit failed and was rolled back. Re-inspect the affected code before editing. Your NEXT tool call MUST be read_file; do not repeat the same replacement or anchor. Prefer insert_after for a small additive change.' });";
if (brain.includes(failurePrompt)) brain = brain.replace(failurePrompt, hardenedFailurePrompt);
else if (!brain.includes('Edit failed and was rolled back. Re-inspect')) throw new Error('edit recovery prompt not found; refusing recovery migration');

const contractMarkers = [
  "name: 'edit_file'",
  "enum: ['replace', 'insert_after']",
  'function insertAfter(file, anchor, addition, objective)',
  "call.args.mode === 'insert_after'",
  "failedEditFiles.delete(String(call.args.file || ''))",
  "toolPhase = result === 'PASS' ? 'submit' : 'inspect'",
  'Edit failed and was rolled back. Re-inspect',
];
for (const marker of contractMarkers) if (!brain.includes(marker)) throw new Error(`edit protocol marker missing: ${marker}`);
fs.writeFileSync(brainPath, brain);
try {
  execFileSync(process.execPath, ['--check', brainPath], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
  fs.writeFileSync(brainPath, originalBrain);
  throw new Error(`hardened feature brain syntax validation failed; restored original: ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(0, 3000)}`);
}
console.log('[autobot] Qwen edit protocol PASS: additive insert_after mode, bounded edit size, syntax rollback, same-file reinspection recovery, verification-failure reinspection, and post-hardening syntax validation installed.');
