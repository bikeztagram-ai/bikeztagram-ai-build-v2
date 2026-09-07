#!/usr/bin/env node
/**
 * Local repository coding agent for Bikeztagram AI.
 * A bounded ACI-style loop lets the model search, view, edit, inspect diffs,
 * run checks, diagnose failures and repair. Mutations are objective-scoped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { appendAudit } from '../quality/audit-log.mjs';

const PROTOCOL = 'structured-search-replace-v4';
const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '15', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:7b';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const timeoutSeconds = Math.max(90, Number.parseInt(process.env.LOCAL_AI_FEATURE_TIMEOUT_SECONDS || '210', 10));
const maxFeatures = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES || '1', 10));
const maxAttemptsPerFeature = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || '2', 10));
const maxEdits = Math.max(1, Math.min(6, Number.parseInt(process.env.AUTOBOT_FEATURE_MAX_EDITS || '2', 10)));
const maxTurns = Math.max(4, Math.min(12, Number.parseInt(process.env.AUTOBOT_AGENT_TURNS || '8', 10)));
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const abs = (p) => path.join(root, p);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
const capture = (cmd, args) => { try { return run(cmd, args); } catch (e) { return [e.stdout, e.stderr, e.message].filter(Boolean).join('\n'); } };

function read(p, max = 9000) {
  const f = abs(p); if (!fs.existsSync(f)) return '';
  const text = fs.readFileSync(f, 'utf8'); return text.length <= max ? text : `${text.slice(0, max)}\n...[truncated]...`;
}
const objectives = JSON.parse(read('builder/brain/feature-objectives.json', 30000)).objectives || [];
const statePath = abs('builder/working/feature-brain-state.json');
let state = { completed: [], progress: {}, failed: {} };
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
const progress = { ...(state.progress || {}) };
for (const id of state.completed || []) progress[id] = Math.max(progress[id] || 0, 1);
const attemptsThisRun = new Map();

function save() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ version: 8, completed: [], progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}
function dependenciesMet(obj) { return (obj.dependsOn || []).every((dep) => progress[dep] > 0 || state.completed?.includes(dep)); }
function choose() {
  const available = objectives.filter((o) => dependenciesMet(o) && (attemptsThisRun.get(o.id) || 0) < maxAttemptsPerFeature);
  if (!available.length) return null;
  return available.sort((a, b) => {
    const af = state.failed?.[a.id]?.attempts || 0, bf = state.failed?.[b.id]?.attempts || 0;
    const as = (a.priority || 0) - (progress[a.id] || 0) * 12 - af * 8;
    const bs = (b.priority || 0) - (progress[b.id] || 0) * 12 - bf * 8;
    return (bs - as) || ((b.priority || 0) - (a.priority || 0));
  })[0];
}
function allowedFile(file, obj) { return new Set(obj.files || []).has(file); }

function snapshotFiles(obj) {
  const snapshots = new Map();
  for (const file of obj.files || []) { const f = abs(file); if (fs.existsSync(f)) snapshots.set(file, fs.readFileSync(f, 'utf8')); }
  return snapshots;
}
function restoreAttemptFiles(snapshots) { for (const [file, content] of snapshots) fs.writeFileSync(abs(file), content); }
function gitStatus() { return capture('git', ['status', '--short']).slice(0, 5000); }
function gitDiff() { return capture('git', ['diff', '--', 'src', 'public']).slice(0, 9000); }
function searchRepo(query) {
  const q = String(query || '').trim(); if (!q) return 'ERROR: empty search query';
  const out = capture('git', ['grep', '-n', '-I', '-F', '--', q, 'src', 'public']); return out.trim() ? out.slice(0, 5000) : `No matches for: ${q}`;
}
function readFileWindow(file, start = 1, end = 100, obj) {
  if (!allowedFile(file, obj)) return `ERROR: out-of-scope file: ${file}`;
  const f = abs(file); if (!fs.existsSync(f)) return `ERROR: file not found: ${file}`;
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/); const first = Math.max(1, Number(start) || 1); const last = Math.min(lines.length, first + 99, Number(end) || first + 99);
  return lines.slice(first - 1, last).map((x, i) => `${String(first + i).padStart(4, ' ')}| ${x}`).join('\n').slice(0, 7000);
}
function syntaxCheck(file) {
  if (!/\.(?:js|mjs|cjs|jsx)$/.test(file)) return 'syntax check deferred to build';
  try { run(process.execPath, ['--check', file]); return 'syntax check PASS'; } catch (e) { return `syntax check FAIL\n${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(0, 5000)}`; }
}
function editFile(file, search, replace, obj) {
  if (!allowedFile(file, obj)) return 'ERROR: out-of-scope file. Only objective product files may be edited.';
  const f = abs(file); if (!fs.existsSync(f)) return `ERROR: file not found: ${file}`;
  if (!search || typeof replace !== 'string') return 'ERROR: search and replace are required.';
  const current = fs.readFileSync(f, 'utf8'); const matches = current.split(search).length - 1;
  if (matches !== 1) return `ERROR: search must match exactly once; found ${matches}. Re-read the file and choose a smaller unique anchor.`;
  const next = current.replace(search, replace); if (next === current || !next.trim()) return 'ERROR: refusing empty/no-op edit.';
  fs.writeFileSync(f, next); const syntax = syntaxCheck(file);
  if (syntax.includes('FAIL')) return `${syntax}\nEDIT REJECTED: restore this file before continuing.`;
  return `EDIT APPLIED: ${file}\n${syntax}`;
}
function runCheck(check) {
  try {
    if (check === 'diff-check') { run('git', ['diff', '--check']); return 'git diff --check PASS'; }
    if (check === 'build') return `npm run build PASS\n${run('npm', ['run', 'build']).slice(-6000)}`;
    if (check === 'changed-syntax') {
      const files = capture('git', ['diff', '--name-only', '--', 'src', 'public']).split(/\r?\n/).filter((p) => /\.(?:js|mjs|cjs|jsx)$/.test(p));
      const bad = files.map(syntaxCheck).filter((x) => x.includes('FAIL')); return bad.length ? bad.join('\n') : `changed JS syntax PASS (${files.length} files)`;
    }
    return `ERROR: unsupported check '${check}'`;
  } catch (e) { return `${check} FAIL\n${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(-7000)}`; }
}

const tools = [
  { type: 'function', function: { name: 'search_repo', description: 'Search product source for an exact string.', parameters: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } } },
  { type: 'function', function: { name: 'read_file', description: 'View up to 100 lines from an objective product file.', parameters: { type: 'object', required: ['file'], properties: { file: { type: 'string' }, start: { type: 'integer' }, end: { type: 'integer' } } } } },
  { type: 'function', function: { name: 'git_status', description: 'Inspect current working-tree status.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'git_diff', description: 'Inspect current product-source diff.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'edit_file', description: 'Atomically replace one exact source block. Only objective files are permitted. Multiple edits in one file are allowed only when each search is unique and non-overlapping.', parameters: { type: 'object', required: ['file', 'search', 'replace'], properties: { file: { type: 'string' }, search: { type: 'string' }, replace: { type: 'string' } } } } },
  { type: 'function', function: { name: 'run_check', description: 'Run a bounded verification check.', parameters: { type: 'object', required: ['check'], properties: { check: { type: 'string', enum: ['build', 'diff-check', 'changed-syntax'] } } } } },
  { type: 'function', function: { name: 'submit', description: 'Finish only after a meaningful product change has been verified.', parameters: { type: 'object', required: ['summary'], properties: { summary: { type: 'string' } } } } },
];

function parseToolCalls(response) { return (response?.message?.tool_calls || []).map((c) => ({ name: c.function?.name, arguments: typeof c.function?.arguments === 'string' ? JSON.parse(c.function.arguments) : (c.function?.arguments || {}) })); }
function modelCall(messages) {
  const seconds = Math.min(timeoutSeconds, Math.max(45, Math.floor(left() * 60)));
  const body = JSON.stringify({ model, stream: false, keep_alive: '15m', tools, options: { temperature: 0, num_ctx: 8192, num_predict: 1800 }, messages });
  try { const raw = run('curl', ['-sS', '--fail', '--connect-timeout', '15', '--max-time', String(seconds), `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { timeout: (seconds + 5) * 1000 }); const response = JSON.parse(raw); if (response.error) throw new Error(String(response.error)); return response; }
  catch (e) { throw new Error(`local agent request failed: ${e.message}`); }
}
function initialPrompt(obj, repair) {
  const failure = state.failed?.[obj.id];
  return `You are the autonomous senior engineer for Bikeztagram AI. Work on the real repository using the supplied tools; do not merely describe a plan.

OBJECTIVE: ${obj.title}\nPriority: ${obj.priority}\nPrevious verified increments: ${progress[obj.id] || 0}\nDependencies: ${(obj.dependsOn || []).join(', ') || 'none'}

ACCEPTANCE:\n- ${(obj.acceptance || []).join('\n- ')}
CONSTRAINTS:\n- ${(obj.constraints || []).join('\n- ')}
OBJECTIVE FILES (ONLY these may be edited):\n${(obj.files || []).map((f) => `- ${f}`).join('\n')}

Rules: explore first when needed; make a coherent production change; use at most ${maxEdits} edits; preserve all existing working-tree changes; never reset/clean; never modify builder infrastructure, workflows, secrets, dependencies or Vercel config; never use Gemini or paid providers. After editing, inspect the diff and run changed-syntax, diff-check and build as appropriate. If a check fails, diagnose and repair it, then rerun the check. Submit only after independent verification. This is an agent loop, not a one-shot patch generator.
${repair ? `\nPREVIOUS FAILURE:\n${String(failure?.message || '').slice(0, 5000)}\nDIFF:\n${String(failure?.diff || '').slice(0, 5000)}` : ''}`;
}

function executeTool(name, args, obj, snapshots, touched, editCount) {
  if (name === 'search_repo') return searchRepo(args.query);
  if (name === 'read_file') return readFileWindow(args.file, args.start, args.end, obj);
  if (name === 'git_status') return gitStatus();
  if (name === 'git_diff') return gitDiff();
  if (name === 'run_check') return runCheck(args.check);
  if (name === 'edit_file') {
    if (editCount.value >= maxEdits) return `ERROR: edit budget exhausted (${maxEdits}). Run verification or submit.`;
    if (!snapshots.has(args.file)) { const f = abs(args.file); if (fs.existsSync(f)) snapshots.set(args.file, fs.readFileSync(f, 'utf8')); }
    const result = editFile(args.file, args.search, args.replace, obj);
    if (result.startsWith('EDIT APPLIED')) { editCount.value += 1; touched.add(args.file); }
    return result;
  }
  if (name === 'submit') return `SUBMIT REQUESTED: ${String(args.summary || '').slice(0, 1000)}`;
  return `ERROR: unknown tool ${name}`;
}
function verifySubmission(obj) {
  const product = gitStatus().split(/\r?\n/).map((line) => line.trim().split(/\s+/).at(-1)).filter((p) => p && /^src\//.test(p) && allowedFile(p, obj));
  if (!product.length) return { ok: false, reason: 'No objective product-source change was produced.' };
  try { run('git', ['diff', '--check']); run('npm', ['run', 'build']); } catch (e) { return { ok: false, reason: `independent verification failed: ${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(-7000)}` }; }
  return { ok: true, files: [...new Set(product)] };
}

function runObjective(obj, repair = false) {
  const snapshots = snapshotFiles(obj); const touched = new Set(); const editCount = { value: 0 };
  const messages = [{ role: 'system', content: 'You are a tool-using senior software engineer. Search, read, edit, execute checks, diagnose, repair, and submit verified code.' }, { role: 'user', content: initialPrompt(obj, repair) }];
  let submitted = false; let summary = '';
  for (let turn = 1; turn <= maxTurns && left() > 0.75; turn += 1) {
    console.log(`[autobot] agent turn ${turn}/${maxTurns}; edits=${editCount.value}/${maxEdits}; ${left().toFixed(1)}m remaining`);
    const response = modelCall(messages); const assistant = response.message || { role: 'assistant', content: '' }; messages.push(assistant); const calls = parseToolCalls(response);
    if (!calls.length) { console.log(`[autobot] agent stopped without tool call: ${String(assistant.content || '').slice(0, 800)}`); break; }
    for (const call of calls) {
      if (call.name === 'submit') { submitted = true; summary = String(call.arguments.summary || '').slice(0, 1000); messages.push({ role: 'tool', tool_name: call.name, content: 'Submission received. Runner verification is authoritative.' }); continue; }
      const result = executeTool(call.name, call.arguments, obj, snapshots, touched, editCount);
      console.log(`[autobot] ${call.name}: ${result.slice(0, 900).replace(/\n/g, ' ')}`); messages.push({ role: 'tool', tool_name: call.name, content: result.slice(0, 6500) });
    }
    if (submitted) break;
  }
  if (!submitted) { restoreAttemptFiles(snapshots); return { ok: false, message: 'Agent exhausted tool turns without submitting a verified increment.', touched: [...touched] }; }
  const verification = verifySubmission(obj);
  if (!verification.ok) { restoreAttemptFiles(snapshots); return { ok: false, message: verification.reason, touched: [...touched] }; }
  return { ok: true, message: summary || 'Verified production increment', touched: verification.files };
}
function recordFailure(obj, message, touched) {
  const previous = state.failed?.[obj.id] || {}; state.failed = state.failed || {};
  state.failed[obj.id] = { attempts: (previous.attempts || 0) + 1, class: /build|syntax|diff/i.test(message) ? 'verification-build' : 'implementation', message: String(message).slice(0, 7000), diff: gitDiff().slice(0, 7000), anchors: touched.join(', '), updatedAt: new Date().toISOString() }; save();
}
function markSuccess(obj, result) { progress[obj.id] = (progress[obj.id] || 0) + 1; delete state.failed?.[obj.id]; save(); appendAudit('feature-increment-verified', { objectiveId: obj.id, progress: progress[obj.id], files: result.touched, protocol: PROTOCOL, agentic: true }); }

if (process.env.LOCAL_AI_READY !== '1') { console.error('[autobot] local AI unavailable; feature brain refuses paid fallback'); process.exit(2); }
appendAudit('feature-brain-run-started', { minutes, model, maxFeatures, maxAttemptsPerFeature, maxEdits, maxTurns, timeoutSeconds, protocol: PROTOCOL, agentic: true });
console.log(`[autobot] agentic feature brain: model=${model}; turns=${maxTurns}; edits=${maxEdits}`);
for (let n = 1; n <= maxFeatures && left() > 1; n += 1) {
  const obj = choose(); if (!obj) { console.log('[autobot] no eligible feature objective is available'); break; }
  for (let attempt = 1; attempt <= maxAttemptsPerFeature && left() > 1; attempt += 1) {
    attemptsThisRun.set(obj.id, (attemptsThisRun.get(obj.id) || 0) + 1); appendAudit('feature-attempt-started', { objectiveId: obj.id, attempt, protocol: PROTOCOL, agentic: true });
    console.log(`[autobot] FEATURE ${n}/${maxFeatures}: ${obj.id} — attempt ${attempt}/${maxAttemptsPerFeature}`);
    let result;
    try { result = runObjective(obj, attempt > 1); } catch (error) { result = { ok: false, message: error.message, touched: [] }; }
    if (result.ok) { markSuccess(obj, result); console.log(`[autobot] VERIFIED increment for ${obj.id}: ${result.message}`); appendAudit('feature-attempt-verified', { objectiveId: obj.id, attempt, files: result.touched, progress: progress[obj.id] }); break; }
    recordFailure(obj, result.message, result.touched); appendAudit('feature-attempt-failed', { objectiveId: obj.id, attempt, message: result.message.slice(0, 3000), touched: result.touched }); console.error(`[autobot] feature attempt failed; scoped recovery preserved unrelated work: ${result.message.slice(0, 1200)}`);
  }
}
appendAudit('feature-brain-run-finished', { elapsedMinutes: Number(((Date.now() - started) / 60000).toFixed(2)), progress, protocol: PROTOCOL, agentic: true }); save();
console.log(`[autobot] agentic feature brain finished with progress: ${JSON.stringify(progress)}`);
