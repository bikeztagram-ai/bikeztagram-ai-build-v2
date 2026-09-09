#!/usr/bin/env node
/**
 * Repository-aware local Qwen coding agent for Bikeztagram AI.
 * Compact context, explicit edit progression, bounded verification and transactional recovery.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { appendAudit } from '../quality/audit-log.mjs';

const root = process.cwd();
const minutes = Number(process.env.BUILDER_MAX_MINUTES || 15);
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const abs = (file) => path.join(root, file);
const REQUIRED_LOCAL_MODEL = 'qwen3:4b-instruct-2507-q4_K_M';
const model = process.env.LOCAL_AI_MODEL || REQUIRED_LOCAL_MODEL;
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const maxEdits = Math.min(6, Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_EDITS || 3)));
const maxTurns = Math.min(10, Math.max(4, Number(process.env.AUTOBOT_AGENT_TURNS || 8)));
const maxFeatures = Math.max(1, Number(process.env.AUTOBOT_FEATURE_PASSES || 1));
const maxAttempts = Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || 1));
const PROTOCOL = 'repository-aware-agent-v7';

if (model !== REQUIRED_LOCAL_MODEL) throw new Error(`Unsupported local model: ${model}. Fast Brain is hardwired to ${REQUIRED_LOCAL_MODEL}.`);

const run = (command, args = [], options = {}) => execFileSync(command, args, { cwd: root, encoding: 'utf8', ...options });
const capture = (command, args) => { try { return run(command, args); } catch (error) { return [error.stdout, error.stderr, error.message].filter(Boolean).join('\n'); } };
const read = (file) => { try { return fs.readFileSync(abs(file), 'utf8'); } catch { return ''; } };
const isSensitive = (file) => /(^|\/)(\.env(?:\..*)?|.*(?:secret|credential|token|private).*|.*\.pem)$/i.test(file);
const isSafeRepoFile = (file) => Boolean(file) && !file.includes('..') && !file.startsWith('/') && !isSensitive(file) && (repo.files || []).some((entry) => entry.path === file);

const mapPath = abs('builder/working/repository-map.json');
if (!fs.existsSync(mapPath)) run(process.execPath, ['builder/runner/repository-index.mjs']);
const repo = JSON.parse(read('builder/working/repository-map.json'));
const objectives = JSON.parse(read('builder/brain/feature-objectives.json')).objectives || [];
const statePath = abs('builder/working/feature-brain-state.json');
let state = { completed: [], progress: {}, failed: {} };
try { state = JSON.parse(read('builder/working/feature-brain-state.json')); } catch {}
const progress = { ...(state.progress || {}) };
for (const id of state.completed || []) progress[id] = Math.max(progress[id] || 0, 1);
const attempts = new Map();

function saveState() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const completedIds = objectives.filter((objective) => (progress[objective.id] || 0) >= 1).map((objective) => objective.id);
  fs.writeFileSync(statePath, JSON.stringify({ version: 15, completed: completedIds, progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}
function dependenciesMet(objective) { return (objective.dependsOn || []).every((dependency) => progress[dependency] > 0 || (state.completed || []).includes(dependency)); }
function chooseObjective() {
  const available = objectives.filter((o) => dependenciesMet(o) && (progress[o.id] || 0) < 1 && (state.failed?.[o.id]?.attempts || 0) < 2 && (attempts.get(o.id) || 0) < maxAttempts);
  available.sort((a, b) => ((b.priority || 0) - (progress[b.id] || 0) * 12 - (state.failed?.[b.id]?.attempts || 0) * 8) - ((a.priority || 0) - (progress[a.id] || 0) * 12 - (state.failed?.[a.id]?.attempts || 0) * 8));
  return available[0] || null;
}
function allowedFile(file, objective) { return new Set(objective.files || []).has(file); }
function gitStatus() { return capture('git', ['status', '--short']).slice(0, 3500); }
function gitDiff() { return capture('git', ['diff', '--', 'src', 'public']).slice(0, 7000); }
function syntaxCheck(file) {
  if (!/\.(js|mjs|cjs|jsx|ts|tsx)$/.test(file)) return 'PASS';
  const ext = path.extname(file).toLowerCase();
  const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');
  if (fs.existsSync(esbuild)) {
    const out = path.join(os.tmpdir(), 'autobot-syntax-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(16).slice(2) + '.js');
    try {
      const args = [file, '--log-level=error', '--outfile=' + out];
      if (ext === '.jsx') args.push('--loader:.jsx=jsx');
      if (ext === '.tsx') args.push('--loader:.tsx=tsx');
      run(esbuild, args, { stdio: 'pipe' });
      return 'PASS';
    } catch (error) { return `FAIL ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(0, 2200)}`; }
    finally { try { fs.rmSync(out, { force: true }); } catch {} }
  }
  try { run(process.execPath, ['--check', file]); return 'PASS'; }
  catch (error) { return `FAIL ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(0, 2200)}`; }
}
function runCheck(check) {
  try {
    if (check === 'build') run('npm', ['run', 'build']);
    else if (check === 'diff-check') run('git', ['diff', '--check']);
    else if (check === 'changed-syntax') for (const file of capture('git', ['diff', '--name-only', '--', 'src', 'public']).split(/\r?\n/).filter(Boolean)) if (syntaxCheck(file) !== 'PASS') throw new Error(`syntax failed: ${file}`);
    else return `ERROR: unsupported check ${check}`;
    return 'PASS';
  } catch (error) { return `FAIL ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(-5000)}`; }
}
function readFileWindow(file, start = 1, end = 90, objective) {
  file = String(file || '');
  if (!isSafeRepoFile(file)) return 'ERROR: file is not a safe indexed repository file.';
  if (!allowedFile(file, objective)) return 'ERROR: file is outside the objective write/read scope.';
  const lines = read(file).split(/\r?\n/);
  const requestedStart = Math.max(1, Number(start) || 1);
  const requestedEnd = Number(end) > requestedStart ? Number(end) : requestedStart + 89;
  const first = Math.max(1, requestedStart - 35);
  const last = Math.min(lines.length, Math.max(requestedEnd, requestedStart + 69) + 35);
  return lines.slice(first - 1, last).map((line, i) => `${String(first + i).padStart(4, ' ')}| ${line}`).join('\n').slice(0, 7000);
}
function editFile(file, search, replacement, objective) {
  file = String(file || '');
  if (!allowedFile(file, objective) || !isSafeRepoFile(file)) return 'ERROR: out-of-scope or unsafe write.';
  const current = read(file);
  if (!current) return `ERROR: file not found: ${file}`;
  if (!search || typeof replacement !== 'string') return 'ERROR: search and replace are required.';
  const matches = current.split(search).length - 1;
  if (matches !== 1) return `ERROR: exact search must match once; found ${matches}. Read a smaller unique block.`;
  const next = current.replace(search, replacement);
  if (next === current || !next.trim()) return 'ERROR: no-op or empty edit refused.';
  fs.writeFileSync(abs(file), next);
  const syntax = syntaxCheck(file);
  if (syntax !== 'PASS') {
    fs.writeFileSync(abs(file), current);
    return `ERROR: edit rejected and rolled back; ${syntax}. The file is restored to its pre-edit state. Do NOT retry the same replacement. Choose a different objective file or a much smaller syntactically complete replacement.`;
  }
  return `EDIT APPLIED: ${file}`;
}

const tools = [
  { type: 'function', function: { name: 'read_file', description: 'Read an expanded context window around the requested location from an objective file. The returned window intentionally includes surrounding lines so you can see enclosing functions/blocks.', parameters: { type: 'object', required: ['file'], properties: { file: { type: 'string' }, start: { type: 'integer' }, end: { type: 'integer' } } } } },
  { type: 'function', function: { name: 'git_status', description: 'Inspect working tree status.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'git_diff', description: 'Inspect product source diff.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'edit_file', description: 'Apply one exact replacement in an objective file. Prefer a complete syntactic block rather than a fragment.', parameters: { type: 'object', required: ['file', 'search', 'replace'], properties: { file: { type: 'string' }, search: { type: 'string' }, replace: { type: 'string' } } } } },
  { type: 'function', function: { name: 'run_check', description: 'Run build, diff-check, or changed-syntax.', parameters: { type: 'object', required: ['check'], properties: { check: { type: 'string', enum: ['build', 'diff-check', 'changed-syntax'] } } } } },
  { type: 'function', function: { name: 'submit', description: 'Finish after a real product edit and verification.', parameters: { type: 'object', required: ['summary'], properties: { summary: { type: 'string' } } } } }
];

function objectiveContext(objective) {
  const files = (objective.files || []).map((file) => {
    if (!isSafeRepoFile(file)) return null;
    const entry = repo.files.find((item) => item.path === file);
    const content = read(file);
    return { path: file, lines: entry?.lines || content.split(/\r?\n/).length - 1, purpose: entry?.purpose || '', preview: content.slice(0, 650) };
  }).filter(Boolean);
  const edges = (repo.dependencyEdges || []).filter((e) => (objective.files || []).includes(e.from) || (objective.files || []).includes(e.to)).slice(0, 8);
  return JSON.stringify({ files, dependencyEdges: edges });
}
function parseToolCalls(response) {
  const native = (response?.message?.tool_calls || []).map((call) => ({ name: call.function?.name, args: typeof call.function?.arguments === 'string' ? JSON.parse(call.function.arguments) : (call.function?.arguments || {}) })).filter((c) => c.name);
  if (native.length) return native;
  const content = String(response?.message?.content || '');
  const out = [];
  for (const match of content.matchAll(/<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/gi)) {
    try { const p = JSON.parse(match[1]); if (p?.name) out.push({ name: p.name, args: p.arguments || p.args || {} }); } catch {}
  }
  return out;
}
function trimMessages(messages) {
  if (messages.length <= 8) return messages;
  return [messages[0], messages[1], ...messages.slice(-6)];
}
function modelCall(messages) {
  const seconds = Math.min(180, Math.max(45, Math.floor(left() * 60)));
  const body = JSON.stringify({ model, stream: false, keep_alive: '15m', think: false, tools, options: { temperature: 0, num_ctx: 4096, num_predict: 900 }, messages: trimMessages(messages) });
  const raw = run('curl', ['-sS', '--fail', '--connect-timeout', '10', '--max-time', String(seconds), `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { timeout: (seconds + 10) * 1000 });
  const response = JSON.parse(raw);
  if (response.error) throw new Error(String(response.error));
  return response;
}

function executeObjective(objective, repair) {
  const snapshots = new Map();
  for (const file of objective.files || []) if (fs.existsSync(abs(file))) snapshots.set(file, read(file));
  let editCount = 0; let submitted = false; let summary = ''; let inspected = false; let emptyTurns = 0; let failedEditAttempts = 0; const failedEditFiles = new Set();
  const context = objectiveContext(objective);
  const basePrompt = [
    'You are the senior autonomous engineer for Bikeztagram AI. You must make a real product-source improvement.',
    `OBJECTIVE: ${objective.title}`,
    `ACCEPTANCE: ${(objective.acceptance || []).join(' | ')}`,
    `CONSTRAINTS: ${(objective.constraints || []).join(' | ')}`,
    `FILES YOU MAY EDIT: ${(objective.files || []).join(', ')}`,
    `CURRENT CONTEXT: ${context}`,
    '',
    'EXECUTION CONTRACT:',
    'First inspect one supplied file with read_file if needed. The requested line range is only a location hint; the tool will return expanded surrounding context so you can see the enclosing function/block.',
    'Do not edit until you have enough surrounding context to understand the complete syntactic unit you are changing.',
    'Then STOP INSPECTING and call edit_file with one precise, meaningful improvement. Prefer a complete function/block or other syntactically self-contained multi-line search block.',
    'After EDIT APPLIED, call run_check with build or diff-check, repair failures if necessary, then call submit.',
    'Do not give an explanation or plan instead of a tool call. Do not edit infrastructure. Never invent media or capabilities.',
    repair ? 'This is a repair attempt after a previous non-submitting attempt. You MUST progress to edit_file.' : ''
  ].join('\n');
  let messages = [
    { role: 'system', content: 'Act only through the supplied tools. Prefer an actionable tool call over prose. Inspect enough surrounding code to understand the enclosing unit before editing. After inspection, edit.' },
    { role: 'user', content: basePrompt }
  ];

  for (let turn = 1; turn <= maxTurns && left() > 0.75; turn += 1) {
    console.log(`[autobot] agent turn ${turn}/${maxTurns}; edits=${editCount}/${maxEdits}; ${left().toFixed(1)}m left`);
    let response;
    try { response = modelCall(messages); }
    catch (error) {
      console.error(`[autobot] model call failed: ${error.message}`);
      messages.push({ role: 'user', content: inspected ? 'The model call failed. Next response MUST be edit_file using the supplied file context. No prose.' : 'The model call failed. Next response MUST be read_file on a supplied objective file. No prose.' });
      continue;
    }
    const assistant = response.message || { role: 'assistant', content: '' };
    messages.push(assistant);
    const calls = parseToolCalls(response);
    if (!calls.length) {
      emptyTurns += 1;
      console.log(`[autobot] no usable tool call returned (${emptyTurns}/2); content=${String(response?.message?.content || '').slice(0, 320).replace(/\n/g, ' ')}`);
      messages.push({ role: 'user', content: inspected ? 'No usable tool call. You have inspected the code. Your NEXT response MUST be exactly one edit_file tool call. Choose the smallest meaningful accepted change.' : 'No usable tool call. Your NEXT response MUST be one read_file tool call on a supplied objective file.' });
      if (emptyTurns >= 2 && !inspected) inspected = true;
      continue;
    }
    emptyTurns = 0;
    for (const call of calls) {
      let result = '';
      if (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 700); result = 'SUBMIT RECEIVED'; }
      else if (call.name === 'read_file') { inspected = true; result = readFileWindow(call.args.file, call.args.start, call.args.end, objective); }
      else if (call.name === 'git_status') result = gitStatus();
      else if (call.name === 'git_diff') result = gitDiff();
      else if (call.name === 'run_check') result = runCheck(call.args.check);
      else if (call.name === 'edit_file') {
        if (editCount >= maxEdits) result = `ERROR: edit budget exhausted (${maxEdits}). Run verification and submit.`;
        else if (failedEditFiles.has(String(call.args.file || ''))) result = 'ERROR: same file is blocked for this attempt after a failed edit. Choose another objective file.';
        else { result = editFile(call.args.file, call.args.search, call.args.replace, objective); if (result.startsWith('EDIT APPLIED')) editCount += 1; else { failedEditAttempts += 1; failedEditFiles.add(String(call.args.file || '')); } }
      } else result = `ERROR: unknown tool ${call.name}`;
      console.log(`[autobot] ${call.name}: ${result.slice(0, 900).replace(/\n/g, ' ')}`);
      messages.push({ role: 'tool', tool_name: call.name, content: result.slice(0, 5000) });
      if (call.name === 'edit_file' && result.startsWith('EDIT APPLIED')) messages.push({ role: 'user', content: 'EDIT APPLIED. Now verify it: call run_check with build or diff-check. Do not make another edit until verification is known.' });
      else if (call.name === 'edit_file' && result.startsWith('ERROR')) {
        if (failedEditAttempts >= 2) { const previous = state.failed?.[objective.id]?.attempts || 0; state.failed = { ...(state.failed || {}), [objective.id]: { attempts: previous + 1, lastError: result.slice(0, 1200), updatedAt: new Date().toISOString() } }; saveState(); }
        messages.push({ role: 'user', content: failedEditAttempts > 1 ? 'Two edit attempts have failed. STOP working on the current file. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' : 'Edit failed. Do NOT repeat the same replacement or edit the failed file again. Your NEXT tool call MUST be read_file on a DIFFERENT objective file, then make one small syntactically complete edit there.' });
      } else if (call.name === 'read_file') messages.push({ role: 'user', content: failedEditAttempts > 0 ? 'Inspection complete. A previous edit failed. Do not retry that file. Your next response MUST be edit_file on a DIFFERENT objective file with the smallest meaningful syntactically complete change.' : 'Inspection complete. Do not read more files. Your next response MUST be edit_file with the smallest meaningful accepted improvement.' });
      else if (call.name === 'run_check' && result === 'PASS') messages.push({ role: 'user', content: 'Verification passed. Now call submit with a concise summary. No prose.' });
      else if (call.name === 'run_check' && result.startsWith('FAIL')) messages.push({ role: 'user', content: 'Verification failed. Diagnose the failure and call edit_file to repair it. No prose.' });
    }
    messages = trimMessages(messages);
    if (submitted) break;
  }

  if (!submitted || editCount < 1) {
    for (const [file, snapshot] of snapshots) if (read(file) !== snapshot) fs.writeFileSync(abs(file), snapshot);
    return { ok: false, reason: submitted ? 'submission had no edit' : 'agent did not submit', edits: editCount };
  }
  const diff = gitDiff();
  if (!diff.trim()) { for (const [file, snapshot] of snapshots) if (read(file) !== snapshot) fs.writeFileSync(abs(file), snapshot); return { ok: false, reason: 'submission had no verified product diff', edits: editCount }; }
  const build = runCheck('build'); const diffCheck = runCheck('diff-check'); const changedSyntax = runCheck('changed-syntax');
  if (build !== 'PASS' || diffCheck !== 'PASS' || changedSyntax !== 'PASS') { for (const [file, snapshot] of snapshots) if (read(file) !== snapshot) fs.writeFileSync(abs(file), snapshot); return { ok: false, reason: `verification failed: ${build} / ${diffCheck} / ${changedSyntax}`, edits: editCount }; }
  progress[objective.id] = Math.max(progress[objective.id] || 0, 1); saveState();
  appendAudit('repository-aware-feature-complete', { protocol: PROTOCOL, objectiveId: objective.id, summary, edits: editCount });
  return { ok: true, objective: objective.id, summary, edits: editCount };
}

let completed = 0;
for (let feature = 0; feature < maxFeatures && left() > 1; feature += 1) {
  const objective = chooseObjective(); if (!objective) break;
  attempts.set(objective.id, (attempts.get(objective.id) || 0) + 1);
  const result = executeObjective(objective, attempts.get(objective.id) > 1);
  if (result.ok) { completed += 1; console.log(`[autobot] feature complete: ${result.objective} edits=${result.edits}`); }
  else { state.failed = state.failed || {}; state.failed[objective.id] = { attempts: attempts.get(objective.id), reason: result.reason, updatedAt: new Date().toISOString() }; saveState(); console.error(`[autobot] feature failed: ${objective.id} ${result.reason}`); }
}
console.log(`[autobot] repository-aware feature brain finished: completed=${completed}`);
if (completed === 0 && maxFeatures > 0) process.exitCode = 1;
