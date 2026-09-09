#!/usr/bin/env node
/**
 * Runtime edit-protocol hardening for the canonical Qwen3 4B feature brain.
 * Keeps the canonical model and safety gates unchanged while giving the model
 * lower-risk additive edit modes and a deterministic re-inspection path.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const originalBrain = fs.readFileSync(brainPath, 'utf8');
let brain = originalBrain;

const editToolPattern = /\{ type: 'function', function: \{ name: 'edit_file',[\s\S]*?\} \} \},\n  \{ type: 'function', function: \{ name: 'run_check'/;
const hardenedEditTool = `{ type: 'function', function: { name: 'edit_file', description: 'Apply one safe product-source edit. Prefer mode=insert_before when adding a new top-level helper/function, using a short unique existing declaration as the anchor. Prefer mode=insert_after only for a complete top-level statement. Use mode=replace only for a small complete syntactic unit. Never insert inside an existing function body unless that is explicitly the intended change.', parameters: { type: 'object', required: ['file', 'search', 'replace'], properties: { file: { type: 'string' }, mode: { type: 'string', enum: ['replace', 'insert_before', 'insert_after'], description: 'Use insert_before for a new top-level helper, insert_after for a complete top-level statement, and replace only for a small complete syntactic unit.' }, search: { type: 'string', description: 'For insert modes, a short unique top-level anchor; for replace, the exact unique old text.' }, replace: { type: 'string', description: 'For insert modes, only the new complete code block; for replace, the complete replacement text.' } } } } },\n  { type: 'function', function: { name: 'run_check'`;
if (!editToolPattern.test(brain)) throw new Error('edit tool contract shape not recognized; refusing edit-protocol migration');
brain = brain.replace(editToolPattern, hardenedEditTool);

const insertionPoint = '\nconst tools = [';
const insertFunctions = `\nfunction insertBefore(file, anchor, addition, objective) {\n  file = String(file || '');\n  if (!allowedFile(file, objective) || !isSafeRepoFile(file)) return 'ERROR: out-of-scope or unsafe write.';\n  const current = read(file);\n  if (!current) return \`ERROR: file not found: \${file}\`;\n  if (!anchor || typeof addition !== 'string' || !addition.trim()) return 'ERROR: insert_before requires a non-empty anchor and code to insert.';\n  const matches = current.split(anchor).length - 1;\n  if (matches !== 1) return \`ERROR: insert_before anchor must match once; found \${matches}. Read a smaller unique anchor.\`;\n  const lines = addition.split(/\\r?\\n/).length;\n  if (lines > 24) return 'ERROR: insert_before block is too large; keep the additive change to 24 lines or fewer.';\n  const separator = addition.endsWith('\\n') ? '' : '\\n';\n  const next = current.replace(anchor, addition + separator + anchor);\n  if (next === current || !next.trim()) return 'ERROR: no-op or empty edit refused.';\n  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') {\n    fs.writeFileSync(abs(file), current);\n    return \`ERROR: insert_before rejected and rolled back; \${syntax}. The file is restored to its pre-edit state. Re-read the affected area and choose a smaller complete block or a different anchor.\`;\n  }\n  return \`EDIT APPLIED: \${file}\`;\n}\nfunction insertAfter(file, anchor, addition, objective) {\n  file = String(file || '');\n  if (!allowedFile(file, objective) || !isSafeRepoFile(file)) return 'ERROR: out-of-scope or unsafe write.';\n  const current = read(file);\n  if (!current) return \`ERROR: file not found: \${file}\`;\n  if (!anchor || typeof addition !== 'string' || !addition.trim()) return 'ERROR: insert_after requires a non-empty anchor and code to insert.';\n  const matches = current.split(anchor).length - 1;\n  if (matches !== 1) return \`ERROR: insert_after anchor must match once; found \${matches}. Read a smaller unique anchor.\`;\n  const lines = addition.split(/\\r?\\n/).length;\n  if (lines > 24) return 'ERROR: insert_after block is too large; keep the additive change to 24 lines or fewer.';\n  const separator = anchor.endsWith('\\n') ? '' : '\\n';\n  const next = current.replace(anchor, anchor + separator + addition);\n  if (next === current || !next.trim()) return 'ERROR: no-op or empty edit refused.';\n  fs.writeFileSync(abs(file), next);\n  const syntax = syntaxCheck(file);\n  if (syntax !== 'PASS') {\n    fs.writeFileSync(abs(file), current);\n    return \`ERROR: insert_after rejected and rolled back; \${syntax}. The file is restored to its pre-edit state. Re-read the affected area and choose a smaller complete block or a different anchor.\`;\n  }\n  return \`EDIT APPLIED: \${file}\`;\n}\n`;
if (!brain.includes('function insertBefore(file, anchor, addition, objective)')) {
  if (!brain.includes(insertionPoint)) throw new Error('tool insertion point not found; refusing edit-protocol migration');
  brain = brain.replace(insertionPoint, insertFunctions + insertionPoint);
}

const editCall = "result = editFile(call.args.file, call.args.search, call.args.replace, objective);";
const hardenedEditCall = "result = call.args.mode === 'insert_before' ? insertBefore(call.args.file, call.args.search, call.args.replace, objective) : call.args.mode === 'insert_after' ? insertAfter(call.args.file, call.args.search, call.args.replace, objective) : editFile(call.args.file, call.args.search, call.args.replace, objective);";
if (brain.includes(editCall)) brain = brain.replace(editCall, hardenedEditCall);
else if (!brain.includes("call.args.mode === 'insert_before' ? insertBefore")) throw new Error('edit handler call not found; refusing edit-protocol migration');

const readHandler = "else if (call.name === 'read_file') { inspected = true; toolPhase = 'edit'; result = readFileWindow(call.args.file, call.args.start, call.args.end, objective); }";
const hardenedReadHandler = "else if (call.name === 'read_file') { inspected = true; failedEditFiles.delete(String(call.args.file || '')); toolPhase = 'edit'; result = readFileWindow(call.args.file, call.args.start, call.args.end, objective); }";
if (brain.includes(readHandler)) brain = brain.replace(readHandler, hardenedReadHandler);
else if (!brain.includes('failedEditFiles.delete(String(call.args.file || \'\'))')) throw new Error('read handler not found; refusing recovery migration');

const verifyFailurePhase = "else if (call.name === 'run_check') { result = runCheck(call.args.check); toolPhase = result === 'PASS' ? 'submit' : 'edit'; }";
const hardenedVerifyFailurePhase = "else if (call.name === 'run_check') { result = runCheck(call.args.check); toolPhase = result === 'PASS' ? 'submit' : 'inspect'; }";
if (brain.includes(verifyFailurePhase)) brain = brain.replace(verifyFailurePhase, hardenedVerifyFailurePhase);
else if (!brain.includes("toolPhase = result === 'PASS' ? 'submit' : 'inspect'")) throw new Error('verification phase handler not found; refusing recovery migration');

const executionPrompt = "First inspect one supplied file with read_file if needed. Then STOP INSPECTING and call edit_file with one precise, meaningful improvement.";
const hardenedExecutionPrompt = "First inspect one supplied file with read_file. Then STOP INSPECTING and call edit_file with one precise, meaningful improvement. For a new top-level helper prefer mode=insert_before with a short unique declaration anchor; use insert_after only for a complete top-level statement; use replace only for a small complete syntactic unit. Never invent an enclosing function body.";
if (brain.includes(executionPrompt)) brain = brain.replace(executionPrompt, hardenedExecutionPrompt);
else if (!brain.includes('For a new top-level helper prefer mode=insert_before')) throw new Error('execution edit prompt not found; refusing prompt migration');

const failurePrompt = "messages.push({ role: 'user', content: failedEditAttempts > 1 ? 'Two edit attempts have failed. STOP working on the current file. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' : 'Edit failed. Do NOT repeat the same replacement or edit the failed file again. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' });";
const hardenedFailurePrompt = "messages.push({ role: 'user', content: failedEditAttempts > 1 ? 'Two edit attempts have failed. Re-inspect the affected code before editing. Your NEXT tool call MUST be read_file; after that use a different anchor or insert_before mode with the smallest complete top-level change.' : 'Edit failed and was rolled back. Re-inspect the affected code before editing. Your NEXT tool call MUST be read_file; do not repeat the same replacement or anchor. Prefer insert_before for a new top-level helper or insert_after for a complete top-level statement.' });";
if (brain.includes(failurePrompt)) brain = brain.replace(failurePrompt, hardenedFailurePrompt);
else if (!brain.includes('Edit failed and was rolled back. Re-inspect')) throw new Error('edit recovery prompt not found; refusing recovery migration');

const contractMarkers = [
  "name: 'edit_file'",
  "enum: ['replace', 'insert_before', 'insert_after']",
  'function insertBefore(file, anchor, addition, objective)',
  'function insertAfter(file, anchor, addition, objective)',
  "call.args.mode === 'insert_before' ? insertBefore",
  "failedEditFiles.delete(String(call.args.file || ''))",
  "toolPhase = result === 'PASS' ? 'submit' : 'inspect'",
  'For a new top-level helper prefer mode=insert_before',
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
console.log('[autobot] Qwen edit protocol PASS: insert_before/insert_after additive modes, bounded edit size, aligned edit prompt, syntax rollback, same-file reinspection recovery, verification-failure reinspection, and post-hardening syntax validation installed.');
