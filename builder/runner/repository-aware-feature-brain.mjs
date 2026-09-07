#!/usr/bin/env node
/**
 * Compact repository-aware coding agent.
 * Each model turn is stateless: objective context + one prior tool result only.
 * This prevents tool/history growth from starving small local coding models.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { appendAudit } from '../quality/audit-log.mjs';

const root = process.cwd();
const minutes = Number(process.env.BUILDER_MAX_MINUTES || 10);
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const abs = (file) => path.join(root, file);
const model = process.env.LOCAL_AI_MODEL || 'qwen3:4b-instruct-2507-q4_K_M';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const maxEdits = Math.min(3, Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_EDITS || 3)));
const maxSteps = Math.min(8, Math.max(3, Number(process.env.AUTOBOT_AGENT_TURNS || 8)));
const maxFeatures = Math.max(1, Number(process.env.AUTOBOT_FEATURE_PASSES || 2));
const maxAttempts = Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || 2));
const PROTOCOL = 'repository-aware-agent-v7';

const run = (command, args = [], options = {}) => execFileSync(command, args, { cwd: root, encoding: 'utf8', shell: false, ...options });
function capture(command, args = []) { try { return run(command, args); } catch (error) { return [error.stdout, error.stderr, error.message].filter(Boolean).join('\n'); } }
function read(file) { try { return fs.readFileSync(abs(file), 'utf8'); } catch { return ''; } }
function isSensitive(file) { return /(^|\/)(\.env(?:\..*)?|.*(?:secret|credential|token|private).*|.*\.pem)$/i.test(file); }
function safeFile(file, objective) { return Boolean(file) && !file.includes('..') && !file.startsWith('/') && !isSensitive(file) && (objective.files || []).includes(file); }
function syntax(file) {
  if (!/\.(js|mjs|cjs|jsx)$/.test(file)) return 'PASS';
  try { run(process.execPath, ['--check', file]); return 'PASS'; } catch (error) { return `FAIL ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(0, 2500)}`; }
}
function runCheck(kind) {
  try { if (kind === 'build') run('npm', ['run', 'build']); else if (kind === 'diff-check') run('git', ['diff', '--check']); else throw new Error(`unsupported check: ${kind}`); return 'PASS'; }
  catch (error) { return `FAIL ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(-5000)}`; }
}
function productDiff() { return capture('git', ['diff', '--', 'src', 'public']).slice(0, 6000); }
function exactEdit(file, search, replace, objective) {
  if (!safeFile(file, objective)) return 'ERROR: out-of-scope write. Only objective files may be edited.';
  const current = read(file); if (!current) return 'ERROR: objective file not found.';
  if (typeof search !== 'string' || typeof replace !== 'string' || !search) return 'ERROR: exact search and replacement are required.';
  const count = current.split(search).length - 1;
  if (count !== 1) return `ERROR: exact search must match once; found ${count}. Read a narrower window or use a smaller unique block.`;
  const next = current.replace(search, replace); if (next === current || !next.trim()) return 'ERROR: refused no-op or empty edit.';
  fs.writeFileSync(abs(file), next); const result = syntax(file); if (result !== 'PASS') return `${result}; repair the syntax before continuing.`;
  return `EDIT APPLIED: ${file}`;
}

const mapPath = abs('builder/working/repository-map.json');
if (!fs.existsSync(mapPath)) run(process.execPath, ['builder/runner/repository-index.mjs']);
const repo = JSON.parse(read('builder/working/repository-map.json'));
const objectives = JSON.parse(read('builder/brain/feature-objectives.json')).objectives || [];
const statePath = abs('builder/working/feature-brain-state.json');
let state = { completed: [], progress: {}, failed: {} };
try { state = JSON.parse(read(statePath)); } catch {}
const progress = { ...(state.progress || {}) };
for (const id of state.completed || []) progress[id] = Math.max(progress[id] || 0, 1);
const attempts = new Map();
function saveState() { fs.mkdirSync(path.dirname(statePath), { recursive: true }); fs.writeFileSync(statePath, JSON.stringify({ version: 14, completed: [], progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\n'); }
function depsMet(o) { return (o.dependsOn || []).every((d) => progress[d] > 0 || (state.completed || []).includes(d)); }
function chooseObjective() {
  const available = objectives.filter((o) => depsMet(o) && (attempts.get(o.id) || 0) < maxAttempts);
  available.sort((a, b) => ((b.priority || 0) - (progress[b.id] || 0) * 12 - (state.failed?.[b.id]?.attempts || 0) * 8) - ((a.priority || 0) - (progress[a.id] || 0) * 12 - (state.failed?.[a.id]?.attempts || 0) * 8));
  return available[0] || null;
}
function objectiveContext(objective) {
  const files = (objective.files || []).filter((f) => safeFile(f, objective)).slice(0, 8).map((file) => {
    const entry = (repo.files || []).find((x) => x.path === file);
    return { path: file, lines: entry?.lines || 0, purpose: entry?.purpose || '', preview: read(file).slice(0, 900) };
  });
  return JSON.stringify({ files }, null, 0).slice(0, 5000);
}

function toolsFor(objective) {
  const allowed = (objective.files || []).filter((f) => safeFile(f, objective));
  const fileSchema = { type: 'string', enum: allowed };
  return [
    { type: 'function', function: { name: 'read_file', description: 'Read a small window from exactly one supplied objective file.', parameters: { type: 'object', required: ['file'], properties: { file: fileSchema, start: { type: 'integer' }, end: { type: 'integer' } } } } },
    { type: 'function', function: { name: 'edit_file', description: 'Apply one exact replacement to exactly one supplied objective file. Search must be copied verbatim from context or read_file.', parameters: { type: 'object', required: ['file', 'search', 'replace'], properties: { file: fileSchema, search: { type: 'string' }, replace: { type: 'string' } } } } },
    { type: 'function', function: { name: 'run_check', description: 'Run build or diff-check after an edit.', parameters: { type: 'object', required: ['check'], properties: { check: { type: 'string', enum: ['build', 'diff-check'] } } } } },
    { type: 'function', function: { name: 'git_diff', description: 'Inspect the compact current product diff.', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'submit', description: 'Finish after a real product edit and verification.', parameters: { type: 'object', required: ['summary'], properties: { summary: { type: 'string' } } } } }
  ];
}
function parseToolCalls(response) {
  const native = (response?.message?.tool_calls || []).map((c) => ({ name: c.function?.name, args: typeof c.function?.arguments === 'string' ? JSON.parse(c.function.arguments) : (c.function?.arguments || {}) }));
  if (native.length) return native.slice(0, 1);
  const text = String(response?.message?.content || ''); const fallback = [];
  for (const match of text.matchAll(/<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g)) { try { const x = JSON.parse(match[1]); if (x.name) fallback.push({ name: x.name, args: x.arguments || {} }); } catch {} }
  return fallback.slice(0, 1);
}
function modelCall(prompt, tools) {
  const seconds = Math.min(120, Math.max(35, Math.floor(left() * 60)));
  const body = JSON.stringify({ model, stream: false, keep_alive: '15m', think: false, tools, options: { temperature: 0, num_ctx: 3072, num_predict: 650 }, messages: [
    { role: 'system', content: 'You are a senior coding agent. Make exactly one useful tool call. Never answer with a plan or prose. Work only on the supplied objective files.' },
    { role: 'user', content: prompt }
  ] });
  const raw = run('curl', ['-sS', '--fail', '--connect-timeout', '8', '--max-time', String(seconds), `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { timeout: (seconds + 8) * 1000 });
  const response = JSON.parse(raw); if (response.error) throw new Error(String(response.error)); return response;
}
function readFileWindow(file, start = 1, end = 80, objective) {
  if (!safeFile(file, objective)) return 'ERROR: read outside objective scope.';
  const lines = read(file).split(/\r?\n/); const first = Math.max(1, Number(start) || 1); const last = Math.min(lines.length, first + 79, Number(end) || first + 79);
  return lines.slice(first - 1, last).map((line, i) => `${first + i}| ${line}`).join('\n').slice(0, 5000);
}

function executeObjective(objective, repair) {
  const snapshots = new Map(); for (const file of objective.files || []) if (fs.existsSync(abs(file))) snapshots.set(file, read(file));
  const ctx = objectiveContext(objective); const tools = toolsFor(objective); let edits = 0; let submitted = false; let summary = ''; let previous = 'NONE'; let lastAction = ''; let repeated = 0; let emptyTurns = 0;
  for (let step = 1; step <= maxSteps && left() > 0.6; step += 1) {
    const prompt = [
      `OBJECTIVE: ${objective.title}`, `PROGRESS: ${progress[objective.id] || 0}`,
      `ACCEPTANCE: ${(objective.acceptance || []).join(' | ')}`, `CONSTRAINTS: ${(objective.constraints || []).join(' | ')}`,
      `EDIT BUDGET: ${edits}/${maxEdits}`, `REPAIR: ${repair ? 'YES — fix the previous failure; do not repeat it.' : 'NO'}`,
      'DETERMINISTIC OBJECTIVE CONTEXT:', ctx, `LAST ACTION RESULT: ${previous.slice(0, 2200)}`,
      `CURRENT PRODUCT DIFF: ${productDiff().slice(0, 3000)}`,
      'Choose exactly ONE action. Start with read_file if needed, then edit_file. After an edit use run_check. Submit only after verification. Never search for hidden files, infrastructure, secrets, or workflows.'
    ].join('\n');
    console.log(`[autobot-v2] step ${step}/${maxSteps}; edits=${edits}/${maxEdits}; ${left().toFixed(1)}m left`);
    let response;
    try { response = modelCall(prompt, tools); } catch (error) { previous = `MODEL ERROR: ${error.message}`; console.error(`[autobot-v2] ${previous}`); continue; }
    const calls = parseToolCalls(response);
    if (!calls.length) { emptyTurns += 1; previous = emptyTurns >= 2 ? 'ERROR: prose-only response repeated. Make a tool call now.' : 'ERROR: no usable tool call. Call read_file or edit_file now.'; continue; }
    emptyTurns = 0; const call = calls[0]; const fingerprint = `${call.name}:${JSON.stringify(call.args)}`;
    if (fingerprint === lastAction) repeated += 1; else repeated = 0; lastAction = fingerprint;
    if (repeated >= 1) { previous = 'ERROR: repeated identical action rejected. Choose a different useful action.'; continue; }
    let result = '';
    if (call.name === 'read_file') result = readFileWindow(call.args.file, call.args.start, call.args.end, objective);
    else if (call.name === 'edit_file') { if (edits >= maxEdits) result = `ERROR: edit budget exhausted (${maxEdits}). Verify or submit.`; else { result = exactEdit(call.args.file, call.args.search, call.args.replace, objective); if (result.startsWith('EDIT APPLIED')) edits += 1; } }
    else if (call.name === 'run_check') result = runCheck(call.args.check);
    else if (call.name === 'git_diff') result = productDiff();
    else if (call.name === 'submit') { submitted = true; summary = String(call.args.summary || '').slice(0, 800); result = 'SUBMITTED'; }
    else result = `ERROR: unsupported tool ${call.name}`;
    previous = result; console.log(`[autobot-v2] ${call.name}: ${result.slice(0, 700).replace(/\n/g, ' ')}`); if (submitted) break;
  }
  const product = productDiff(); const build = submitted && edits > 0 ? runCheck('build') : 'NOT RUN'; const diffCheck = submitted && edits > 0 ? runCheck('diff-check') : 'NOT RUN';
  if (!submitted || edits < 1 || !product.trim() || build !== 'PASS' || diffCheck !== 'PASS') {
    for (const [file, snapshot] of snapshots) if (read(file) !== snapshot) fs.writeFileSync(abs(file), snapshot);
    return { ok: false, reason: !submitted ? 'agent did not submit' : `verification failed: ${build} / ${diffCheck}`, edits };
  }
  progress[objective.id] = Math.max(progress[objective.id] || 0, 1); saveState(); appendAudit('repository-aware-feature-complete', { protocol: PROTOCOL, objectiveId: objective.id, summary, edits });
  return { ok: true, objective: objective.id, summary, edits };
}

let completed = 0;
for (let feature = 0; feature < maxFeatures && left() > 1; feature += 1) {
  const objective = chooseObjective(); if (!objective) break; attempts.set(objective.id, (attempts.get(objective.id) || 0) + 1);
  const result = executeObjective(objective, attempts.get(objective.id) > 1);
  if (result.ok) { completed += 1; console.log(`[autobot-v2] feature complete: ${result.objective} edits=${result.edits}`); }
  else { state.failed = state.failed || {}; state.failed[objective.id] = { attempts: attempts.get(objective.id), reason: result.reason, updatedAt: new Date().toISOString() }; saveState(); console.error(`[autobot-v2] feature failed: ${objective.id} ${result.reason}`); }
}
console.log(`[autobot-v2] finished: completed=${completed}`);
if (completed === 0 && maxFeatures > 0) process.exitCode = 1;
