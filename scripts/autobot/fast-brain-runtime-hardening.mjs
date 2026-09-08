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
if (!brain.includes("import os from 'node:os';")) brain = brain.replace("import path from 'node:path';", "import path from 'node:path';\nimport os from 'node:os';");

// Harden syntax validation without changing the canonical agent protocol.
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

// Hard controller gate: Qwen gets exactly one inspection between edits.
// After a read, read_file is removed from the next tool schema. A failed edit
// re-enables exactly one inspection so Qwen can recover on a different file.
const modelCallPattern = /function modelCall\(messages\) \{[\s\S]*?\n\}/;
const hardenedModelCall = `function modelCall(messages, readToolEnabled = true) {
  const seconds = Math.min(180, Math.max(45, Math.floor(left() * 60)));
  const availableTools = readToolEnabled ? tools : tools.filter((tool) => tool.function?.name !== 'read_file');
  const body = JSON.stringify({ model, stream: false, keep_alive: '15m', think: false, tools: availableTools, options: { temperature: 0, num_ctx: 4096, num_predict: 900 }, messages: trimMessages(messages) });
  const raw = run('curl', ['-sS', '--fail', '--connect-timeout', '10', '--max-time', String(seconds), \`${host}/api/chat\`, '-H', 'Content-Type: application/json', '-d', body], { timeout: (seconds + 10) * 1000 });
  const response = JSON.parse(raw);
  if (response.error) throw new Error(String(response.error));
  return response;
}`;
if (!modelCallPattern.test(brain)) throw new Error('canonical modelCall function shape is not recognized; refusing read-loop migration');
brain = brain.replace(modelCallPattern, hardenedModelCall);
brain = brain.replace(/let editCount = 0; let submitted = false; let summary = ''; let inspected = false; let emptyTurns = 0; let failedEditAttempts = 0; const failedEditFiles = new Set\(\);/, "let editCount = 0; let submitted = false; let summary = ''; let inspected = false; let readToolEnabled = true; let emptyTurns = 0; let failedEditAttempts = 0; const failedEditFiles = new Set();");
brain = brain.replace('response = modelCall(messages);', 'response = modelCall(messages, readToolEnabled);');
brain = brain.replace("else if (call.name === 'read_file') { inspected = true; result = readFileWindow(call.args.file, call.args.start, call.args.end, objective); }", "else if (call.name === 'read_file') { inspected = true; readToolEnabled = false; result = readFileWindow(call.args.file, call.args.start, call.args.end, objective); }");
brain = brain.replace("else { result = editFile(call.args.file, call.args.search, call.args.replace, objective); if (result.startsWith('EDIT APPLIED')) editCount += 1; else { failedEditAttempts += 1; failedEditFiles.add(String(call.args.file || '')); } }", "else { result = editFile(call.args.file, call.args.search, call.args.replace, objective); if (result.startsWith('EDIT APPLIED')) { editCount += 1; readToolEnabled = false; } else { failedEditAttempts += 1; failedEditFiles.add(String(call.args.file || '')); readToolEnabled = true; } }");
if (!brain.includes('availableTools = readToolEnabled ? tools')) throw new Error('read-loop controller was not installed');
if (!brain.includes('readToolEnabled = true')) throw new Error('failed-edit recovery did not re-enable one inspection');
fs.writeFileSync(brainPath, brain);

let tasks = fs.readFileSync(taskPath, 'utf8');
if (tasks.includes('npm run verify:batch33')) {
  tasks = tasks.replaceAll('npm run verify:batch33', 'node scripts/autobot/export-contract-check.mjs');
  fs.writeFileSync(taskPath, tasks);
}
const finalBrain = fs.readFileSync(brainPath, 'utf8');
if (!finalBrain.includes("import os from 'node:os';")) throw new Error('syntax validator runtime dependency import is missing');
if (!finalBrain.includes("const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');")) throw new Error('real syntax validator was not installed');
if (!finalBrain.includes("if (ext === '.jsx') args.push('--loader:.jsx=jsx');")) throw new Error('JSX syntax loader was not installed');
if (!finalBrain.includes("'--outfile=' + out")) throw new Error('esbuild output flag was not installed correctly');
if (!finalBrain.includes('availableTools = readToolEnabled ? tools')) throw new Error('read-loop controller missing after hardening');
if (!finalBrain.includes('readToolEnabled = true')) throw new Error('failed-edit recovery gate missing after hardening');
const finalTasks = fs.readFileSync(taskPath, 'utf8');
if (finalTasks.includes('npm run verify:batch33')) throw new Error('stale export verification command remains after migration');
if (!finalTasks.includes('export-contract-check.mjs')) throw new Error('live export contract check is missing after migration');
console.log('[autobot] Qwen runtime hardening PASS: canonical agent verified, real JS/JSX syntax validation installed, transactional edits verified, durable progress verified, failed-edit recovery verified, one-inspection controller gate installed, export migration guarded.');
