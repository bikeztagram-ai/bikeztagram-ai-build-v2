#!/usr/bin/env node
/** Preflight guard for the canonical local-Qwen feature brain. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const taskPath = path.join(root, 'builder/brain/task-library.json');
let brain = fs.readFileSync(brainPath, 'utf8');

const requiredBrainMarkers = [
  "PROTOCOL = 'repository-aware-agent-v7'", '/api/chat', 'stream: false', 'think: false',
  'tool_name: call.name', 'num_ctx: 4096', 'num_predict: 900', 'fs.writeFileSync(abs(file), next);',
  'const syntax = syntaxCheck(file);', 'edit rejected and rolled back', 'fs.writeFileSync(abs(file), current);',
  'failedEditFiles', 'Do NOT retry the same replacement.', 'completed: completedIds',
  '(progress[o.id] || 0) < 1', 'state.failed',
];
const missing = requiredBrainMarkers.filter((marker) => !brain.includes(marker));
if (missing.length) throw new Error(`canonical feature brain recovery contract incomplete: ${missing.join(', ')}`);

const syntaxFunctionPattern = /function syntaxCheck\(file\) \{[\s\S]*?\n\}\nfunction runCheck/;
const hardenedSyntaxFunction = `function syntaxCheck(file) {
  if (!/\\.(js|mjs|cjs|jsx|ts|tsx)$/.test(file)) return 'PASS';
  const ext = path.extname(file).toLowerCase();
  const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');
  if (fs.existsSync(esbuild)) {
    const out = path.join(os.tmpdir(), 'autobot-syntax-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(16).slice(2) + '.js');
    try {
      const args = [file, '--log-level=error', '--outfile=' + out];
      if (ext === '.jsx') args.push('--loader:.jsx=jsx');
      if (ext === '.tsx') args.push('--loader:.tsx=tsx');
      execFileSync(esbuild, args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
      return 'PASS';
    } catch (error) { return 'FAIL ' + [error.stdout, error.stderr, error.message].filter(Boolean).join('\\n').slice(0, 2200); }
    finally { try { fs.rmSync(out, { force: true }); } catch {} }
  }
  try { execFileSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8', stdio: 'pipe', timeout: 15000 }); return 'PASS'; }
  catch (error) { return 'FAIL ' + [error.stdout, error.stderr, error.message].filter(Boolean).join('\\n').slice(0, 2200); }
}
function runCheck`;
if (!syntaxFunctionPattern.test(brain)) throw new Error('canonical syntaxCheck function shape is not recognized; refusing unsafe migration');
brain = brain.replace(syntaxFunctionPattern, hardenedSyntaxFunction);

const modelCallPattern = /function modelCall\(messages(?:, (?:readToolEnabled = true|toolPhase = 'inspect'))?\) \{[\s\S]*?\n\s*return response;\n\}/;
const hardenedModelCall = `function modelCall(messages, toolPhase = 'inspect') {
  const seconds = Math.min(180, Math.max(45, Math.floor(left() * 60)));
  const allowedByPhase = {
    inspect: new Set(['read_file']),
    edit: new Set(['edit_file']),
    verify: new Set(['run_check']),
    submit: new Set(['submit']),
  };
  // If the previous tool result says the chosen file is blocked, force the
  // next model request back to inspection. This prevents repeated edit calls
  // on the same rejected file from consuming the remaining turn budget.
  const blockedRecovery = messages.some((message) => String(message?.content || '').includes('same file is blocked for this attempt after a failed edit'));
  const effectivePhase = blockedRecovery ? 'inspect' : toolPhase;
  const allowed = allowedByPhase[effectivePhase] || allowedByPhase.inspect;
  const availableTools = tools.filter((tool) => allowed.has(tool.function?.name));
  const body = JSON.stringify({ model, stream: false, keep_alive: '15m', think: false, tools: availableTools, options: { temperature: 0, num_ctx: 4096, num_predict: 900 }, messages: trimMessages(messages) });
  const raw = run('curl', ['-sS', '--fail', '--connect-timeout', '10', '--max-time', String(seconds), \`\${host}/api/chat\`, '-H', 'Content-Type: application/json', '-d', body], { timeout: (seconds + 10) * 1000 });
  const response = JSON.parse(raw);
  if (response.error) throw new Error(String(response.error));
  return response;
}`;
if (!modelCallPattern.test(brain)) throw new Error('canonical modelCall function shape is not recognized; refusing tool-phase migration');
brain = brain.replace(modelCallPattern, hardenedModelCall);

const statePattern = /let editCount = 0; let submitted = false; let summary = ''; let inspected = false;(?: let readToolEnabled = true;)? let toolPhase = 'inspect'; let emptyTurns = 0; let failedEditAttempts = 0; const failedEditFiles = new Set\(\);/;
const legacyStatePattern = /let editCount = 0; let submitted = false; let summary = ''; let inspected = false; let emptyTurns = 0; let failedEditAttempts = 0; const failedEditFiles = new Set\(\);/;
if (statePattern.test(brain)) {
  // Already current; keep hardening idempotent.
} else if (legacyStatePattern.test(brain)) {
  brain = brain.replace(legacyStatePattern, "let editCount = 0; let submitted = false; let summary = ''; let inspected = false; let toolPhase = 'inspect'; let emptyTurns = 0; let failedEditAttempts = 0; const failedEditFiles = new Set();");
} else {
  throw new Error('canonical feature loop state shape is not recognized; refusing tool-phase migration');
}

brain = brain.replace('response = modelCall(messages, readToolEnabled);', 'response = modelCall(messages, toolPhase);');
brain = brain.replace('response = modelCall(messages);', 'response = modelCall(messages, toolPhase);');
brain = brain.replace(
  'const calls = parseToolCalls(response);',
  "const parsedCalls = parseToolCalls(response);\n    const calls = parsedCalls.slice(0, 1);\n    if (parsedCalls.length > 1) messages.push({ role: 'user', content: 'Tool contract violation: use exactly one tool call per turn. Your next response must contain exactly one allowed tool call.' });"
);
const readHandlerPattern = /else if \(call\.name === 'read_file'\) \{[\s\S]*?readFileWindow\(call\.args\.file, call\.args\.start, call\.args\.end, objective\); \}/;
if (readHandlerPattern.test(brain)) {
  brain = brain.replace(readHandlerPattern, "else if (call.name === 'read_file') { inspected = true; toolPhase = 'edit'; result = readFileWindow(call.args.file, call.args.start, call.args.end, objective); }");
} else if (!brain.includes("toolPhase = 'edit'; result = readFileWindow")) {
  throw new Error('canonical read_file handler shape is not recognized; refusing inspection migration');
}
brain = brain.replace(/else if \(call\.name === 'git_status'\) result = gitStatus\(\);/, "else if (call.name === 'git_status') result = 'ERROR: git_status is not available during a Qwen feature turn.';");
brain = brain.replace(/else if \(call\.name === 'git_diff'\) result = gitDiff\(\);/, "else if (call.name === 'git_diff') result = 'ERROR: git_diff is not available during a Qwen feature turn.';");
brain = brain.replace(/else if \(call\.name === 'run_check'\) result = runCheck\(call\.args\.check\);/, "else if (call.name === 'run_check') { result = runCheck(call.args.check); toolPhase = result === 'PASS' ? 'submit' : 'edit'; }");
const editHandlerPattern = /else \{ result = editFile\(call\.args\.file, call\.args\.search, call\.args\.replace, objective\); if \(result\.startsWith\('EDIT APPLIED'\)\) editCount \+= 1; else \{ failedEditAttempts \+= 1; failedEditFiles\.add\(String\(call\.args\.file \|\| ''\)\); \} \}/;
if (editHandlerPattern.test(brain)) {
  brain = brain.replace(editHandlerPattern, "else { result = editFile(call.args.file, call.args.search, call.args.replace, objective); if (result.startsWith('EDIT APPLIED')) { editCount += 1; toolPhase = 'verify'; } else { failedEditAttempts += 1; failedEditFiles.add(String(call.args.file || '')); toolPhase = 'inspect'; } }");
} else if (!brain.includes("toolPhase = 'inspect'; }")) {
  throw new Error('canonical edit handler shape is not recognized; refusing recovery migration');
}

for (const marker of [
  'const allowedByPhase =', 'const blockedRecovery =', 'const effectivePhase = blockedRecovery ? \'inspect\' : toolPhase;',
  "toolPhase = 'inspect'", "toolPhase = 'edit'", "toolPhase = 'verify'",
  "toolPhase = result === 'PASS' ? 'submit' : 'edit'", 'parsedCalls.slice(0, 1)', 'response = modelCall(messages, toolPhase);'
]) if (!brain.includes(marker)) throw new Error(`tool-phase hardening marker missing: ${marker}`);
fs.writeFileSync(brainPath, brain);

let tasks = fs.readFileSync(taskPath, 'utf8');
if (tasks.includes('npm run verify:batch33')) {
  tasks = tasks.replaceAll('npm run verify:batch33', 'node scripts/autobot/export-contract-check.mjs');
  fs.writeFileSync(taskPath, tasks);
}

const finalBrain = fs.readFileSync(brainPath, 'utf8');
for (const marker of [
  "const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');",
  "if (ext === '.jsx') args.push('--loader:.jsx=jsx');", "'--outfile=' + out",
  'const allowedByPhase =', 'const blockedRecovery =', 'const effectivePhase = blockedRecovery ? \'inspect\' : toolPhase;',
  "toolPhase = 'inspect'", "toolPhase = 'edit'", "toolPhase = 'verify'",
  "toolPhase = result === 'PASS' ? 'submit' : 'edit'", 'parsedCalls.slice(0, 1)'
]) if (!finalBrain.includes(marker)) throw new Error(`final hardening verification missing: ${marker}`);
const finalTasks = fs.readFileSync(taskPath, 'utf8');
if (finalTasks.includes('npm run verify:batch33')) throw new Error('stale export verification command remains after migration');
if (!finalTasks.includes('export-contract-check.mjs')) throw new Error('live export contract check is missing after migration');
console.log('[autobot] Qwen runtime hardening PASS: canonical agent verified, real JS/JSX syntax validation installed, transactional edits verified, durable progress verified, failed-edit recovery verified, strict phase-gated tool controller installed, one-tool-per-turn enforcement installed, blocked-file recovery steering installed, export migration guarded.');
