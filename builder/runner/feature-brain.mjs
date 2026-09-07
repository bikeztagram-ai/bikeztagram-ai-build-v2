#!/usr/bin/env node
/**
 * Local repository coding agent for Bikeztagram AI.
 *
 * This is intentionally an ACI-style loop: the model can search, view, edit,
 * inspect diffs, run bounded checks, diagnose failures, repair, and submit.
 * Every mutation is scoped to the current product objective and every failed
 * attempt restores only files touched by that attempt.
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

function read(p, max = 8000) {
  const file = abs(p);
  if (!fs.existsSync(file)) return '';
  const text = fs.readFileSync(file, 'utf8');
  return text.length <= max ? text : `${text.slice(0, max)}\n...[truncated]...`;
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

function dependenciesMet(obj) {
  return (obj.dependsOn || []).every((dep) => progress[dep] > 0 || state.completed?.includes(dep));
}

function choose() {
  const available = objectives.filter((o) => dependenciesMet(o) && (attemptsThisRun.get(o.id) || 0) < maxAttemptsPerFeature);
  if (!available.length) return null;
  return available.sort((a, b) => {
    const af = state.failed?.[a.id]?.attempts || 0;
    const bf = state.failed?.[b.id]?.attempts || 0;
    const as = (a.priority || 0) - (progress[a.id] || 0) * 12 - af * 8;
    const bs = (b.priority || 0) - (progress[b.id] || 0) * 12 - bf * 8;
    return (bs - as) || ((b.priority || 0) - (a.priority || 0));
  })[0];
}

function objectiveFiles(obj) { return new Set(obj.files || []); }
function allowedFile(file, obj) { return objectiveFiles(obj).has(file); }

function snapshotFiles(obj) {
  const snapshots = new Map();
  for (const file of obj.files || []) {
    const full = abs(file);
    if (fs.existsSync(full)) snapshots.set(file, fs.readFileSync(full, 'utf8'));
  }
  return snapshots;
}

function restoreAttemptFiles(snapshots) {
  for (const [file, content] of snapshots) fs.writeFileSync(abs(file), content);
}

function gitDiff() { return capture('git', ['diff', '--', 'src', 'public']).slice(0, 9000); }
function gitStatus() { return capture('git', ['status', '--short']).slice(0, 5000); }

function searchRepo(query) {
  const value = String(query || '').trim();
  if (!value) return 'search query is empty';
  const output = capture('git', ['grep', '-n', '-I', '-F', '--', value, 'src', 'public']);
  return output.trim() ? output.slice(0, 5000) : `No matches for: ${value}`;
}

function readFileWindow(file, start = 1, end = 100, obj) {
  if (!allowedFile(file, obj)) return `ERROR: out-of-scope file: ${file}`;
  const full = abs(file);
  if (!fs.existsSync(full)) return `ERROR: file not found: ${file}`;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  const first = Math.max(1, Number(start) || 1);
  const last = Math.min(lines.length, first + 99, Number(end) || first + 99);
  return lines.slice(first - 1, last).map((line, i) => `${String(first + i).padStart(4, ' ')}| ${line}`).join('\n').slice(0, 7000);
}

function syntaxCheck(file) {
  if (!/\.(?:js|mjs|cjs|jsx|ts|tsx)$/.test(file)) return 'syntax check skipped for non-JS source';
  const ext = path.extname(file);
  if (['.ts', '.tsx'].includes(ext)) return 'syntax check deferred to npm run build for TypeScript';
  try { run(process.execPath, ['--check', file]); return 'syntax check PASS'; } catch (e) { return `syntax check FAIL\n${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(0, 5000)}`; }
}

function editFile(file, search, replace, obj) {
  if (!allowedFile(file, obj)) return 'ERROR: out-of-scope file. Only objective product files may be edited.';
  if (!search || typeof replace !== 'string') return 'ERROR: search and replace are required.';
  const full = abs(file);
  if (!fs.existsSync(full)) return `ERROR: file not found: ${file}`;
  const current = fs.readFileSync(full, 'utf8');
  const matches = current.split(search).length - 1;
  if (matches !== 1) return `ERROR: search must match exactly once; found ${matches} in ${file}. Re-read the file and use a smaller unique anchor.`;
  const next = current.replace(search, replace);
  if (next === current) return 'ERROR: edit produced no change.';
  if (!next.trim()) return 'ERROR: refusing to empty a product source file.';
  fs.writeFileSync(full, next);
  const syntax = syntaxCheck(file);
  if (syntax.includes('FAIL')) return `${syntax}\nEDIT REJECTED: the file was restored.`;
  return `EDIT APPLIED: ${file}\n${syntax}\nThe edit is atomic and scoped; inspect the diff before continuing.`;
}

function runCheck(check, obj) {
  if (check === 'diff-check') {
    try { run('git', ['diff', '--check']); return 'git diff --check PASS'; } catch (e) { return `git diff --check FAIL\n${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(0, 5000)}`; }
  }
  if (check === 'build') {
    try { return `npm run build PASS\n${run('npm', ['run', 'build']).slice(-6000)}`; } catch (e) { return `npm run build FAIL\n${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(-7000)}`; }
  }
  if (check === 'changed-syntax') {
    const files = capture('git', ['diff', '--name-only', '--', 'src', 'public']).split(/\r?\n/).filter(Boolean).filter((p) => /\.(?:js|mjs|cjs|jsx)$/.test(p));
    const failures = files.map(syntaxCheck).filter((x) => x.includes('FAIL'));
    return failures.length ? failures.join('\n') : `changed JS syntax PASS (${files.length} files)`;
  }
  return `ERROR: unsupported check '${check}'. Use build, diff-check, or changed-syntax.`;
}

const tools = [
  { type: 'function', function: { name: 'search_repo', description: 'Search product source for an exact string. Returns concise matches.', parameters: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } } },
  { type: 'function', function: { name: 'read_file', description: 'View up to 100 lines from an objective product file.', parameters: { type: 'object', required: ['file'], properties: { file: { type: 'string' }, start: { type: 'integer' }, end: { type: 'integer' } } } } },
  { type: 'function', function: { name: 'git_status', description: 'Inspect current working-tree status and preserve earlier work.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'git_diff', description: 'Inspect the current product-source diff.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'edit_file', description: 'Atomically replace one exact source block. Only objective files are permitted. Multiple edits in one file are allowed only when each search is unique and non-overlapping.', parameters: { type: 'object', required: ['file', 'search', 'replace'], properties: { file: { type: 'string' }, search: { type: 'string' }, replace: { type: 'string' } } } } },
  { type: 'function', function: { name: 'run_check', description: 'Run a bounded repository check after implementation.', parameters: { type: 'object', required: ['check'], properties: { check: { type: 'string', enum: ['build', 'diff-check', 'changed-syntax'] } } } } },
  { type: 'function', function: { name: 'submit', description: 'Finish only after a meaningful product change has been implemented and verified.', parameters: { type: 'object', required: ['summary'], properties: { summary: { type: 'string' } } } } },
];

function parseToolCalls(response) {
  return (response?.message?.tool_calls || []).map((call) => ({ name: call.function?.name, arguments: typeof call.function?.arguments === 'string' ? JSON.parse(call.function.arguments) : (call.function?.arguments || {}) }));
}

function modelCall(messages) {
  const seconds = Math.min(timeoutSeconds, Math.max(45, Math.floor(left() * 60)));
  const body = JSON.stringify({
    model,
    stream: false,
    keep_alive: '15m',
    tools,
    options: { temperature: 0, num_ctx: 8192, num_predict: 1800 },
    messages,
  });
  try {
    const raw = run('curl', ['-sS', '--fail', '--connect-timeout', '15', '--max-time', String(seconds), `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { timeout: (seconds + 5) * 1000 });
    const response = JSON.parse(raw);
    if (response.error) throw new Error(String(response.error));
    return response;
  } catch (e) {
    throw new Error(`local agent request failed: ${e.message}`);
  }
}

function initialPrompt(obj, repair = false) {
  const failure = state.failed?.[obj.id];
  return `You are the autonomous senior engineer for Bikeztagram AI. You are working inside the real repository, not writing suggestions. Your job is to make one meaningful production increment for this objective.

OBJECTIVE: ${obj.title}
Priority: ${obj.priority}
Previous verified increments: ${progress[obj.id] || 0}
Dependencies: ${(obj.dependsOn || []).join(', ') || 'none'}

ACCEPTANCE:
- ${(obj.acceptance || []).join('\n- ')}

CONSTRAINTS:
- ${(obj.constraints || []).join('\n- ')}

OBJECTIVE FILES (the only files you may edit):
${(obj.files || []).map((f) => `- ${f}`).join('\n')}

RULES:
- Use the tools. Explore before editing when necessary.
- Make a coherent implementation, not a comment-only or cosmetic change.
- You may make up to ${maxEdits} edits in this attempt and may edit multiple objective files when the change genuinely crosses a boundary.
- Preserve all existing working-tree changes. Never reset or clean the repository.
- Search and read exact code before editing. The editor rejects ambiguous anchors.
- After implementation, inspect the diff and run changed-syntax, diff-check, and build as appropriate.
- If a check fails, diagnose the actual failure and repair the code, then rerun the check.
- Do not declare success merely because an edit applied. Submit only after verification.
- Never modify builder infrastructure, workflows, secrets, package dependencies, Vercel config, or protected files.
- Never use Gemini or introduce a paid provider.

This interface deliberately follows proven coding-agent patterns: bounded file views, concise repository search, atomic scoped edits, and execution feedback. Ollama supports multi-turn tool calling, and this Qwen2.5-Coder model supports tool use.
${repair ? `\nPREVIOUS ATTEMPT FAILURE:\n${String(failure?.message || 'unknown').slice(0, 5000)}\nPrevious diff:\n${String(failure?.diff || '').slice(0, 6000)}` : ''}

Start by inspecting the relevant code and then act. Do not answer with a plan instead of editing.`;
}

function executeTool(name, args, obj, snapshots, touched) {
  if (name === 'search_repo') return searchRepo(args.query);
  if (name === 'read_file') return readFileWindow(args.file, args.start, args.end, obj);
  if (name === 'git_status') return gitStatus();
  if (name === 'git_diff') return gitDiff();
  if (name === 'run_check') return runCheck(args.check, obj);
  if (name === 'edit_file') {
    if (!snapshots.has(args.file)) {
      const full = abs(args.file);
      if (fs.existsSync(full)) snapshots.set(args.file, fs.readFileSync(full, 'utf8'));
    }
    const result = editFile(args.file, args.search, args.replace, obj);
    if (result.startsWith('EDIT APPLIED')) touched.add(args.file);
    return result;
  }
  if (name === 'submit') return `SUBMIT REQUESTED: ${args.summary || 'no summary'}`;
  return `ERROR: unknown tool ${name}`;
}

function verifySubmission(obj) {
  const status = gitStatus();
  const productFiles = status.split(/\r?\n/).map((line) => line.trim().split(/\s+/).at(-1)).filter((p) => p && (/^(src|public)\//.test(p)) && allowedFile(p, obj));
  if (!productFiles.length) return { ok: false, reason: 'No objective product-source change was produced.' };
  try { run('git', ['diff', '--check']); } catch (e) { return { ok: false, reason: `git diff --check failed: ${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n')}` }; }
  try { run('npm', ['run', 'build']); } catch (e) { return { ok: false, reason: `npm run build failed: ${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(-7000)}` }; }
  return { ok: true, files: [...new Set(productFiles)] };
}

function runObjective(obj, repair = false) {
  const snapshots = snapshotFiles(obj);
  const touched = new Set();
  const messages = [{ role: 'system', content: 'You are a tool-using senior software engineer. Act on the repository through the supplied tools. Keep changes scoped, test them, and repair failures.' }, { role: 'user', content: initialPrompt(obj, repair) }];
  let submitted = false;
  let summary = '';

  for (let turn = 1; turn <= maxTurns && left() > 0.75; turn += 1) {
    console.log(`[autobot] agent turn ${turn}/${maxTurns}; ${left().toFixed(1)}m remaining`);
    const response = modelCall(messages);
    const assistant = response.message || { role: 'assistant', content: '' };
    messages.push(assistant);
    const calls = parseToolCalls(response);
    if (!calls.length) {
      if (assistant.content) console.log(`[autobot] agent said: ${String(assistant.content).slice(0, 1200)}`);
      break;
    }
    for (const call of calls) {
      if (call.name === 'submit') {
        submitted = true;
        summary = String(call.arguments.summary || '').slice(0, 1000);
        messages.push({ role: 'tool', tool_name: call.name, content: 'Submission received. The runner will independently verify the product change.' });
        continue;
      }
      const result = executeTool(call.name, call.arguments, obj, snapshots, touched);
      console.log(`[autobot] ${call.name}: ${result.slice(0, 900).replace(/\n/g, ' ')}`);
      messages.push({ role: 'tool', tool_name: call.name, content: result.slice(0, 6500) });
    }
    if (submitted) break;
  }

  if (!submitted) return { ok: false, message: 'Agent exhausted its tool turns without submitting a verified increment.', touched: [...touched] };
  const verification = verifySubmission(obj);
  if (!verification.ok) return { ok: false, message: verification.reason, touched: [...touched] };
  return { ok: true, message: summary || 'Verified production increment', touched: verification.files };
}

function recordFailure(obj, message, touched) {
  const previous = state.failed?.[obj.id] || {};
  state.failed = state.failed || {};
  state.failed[obj.id] = {
    attempts: (previous.attempts || 0) + 1,
    class: /build|syntax|diff/i.test(message) ? 'verification-build' : 'implementation',
    message: String(message).slice(0, 7000),
    diff: gitDiff().slice(0, 7000),
    anchors: touched.join(', '),
    updatedAt: new Date().toISOString(),
  };
  save();
}

function markSuccess(obj, result) {
  progress[obj.id] = (progress[obj.id] || 0) + 1;
  delete state.failed?.[obj.id];
  save();
  appendAudit('feature-increment-verified', { objectiveId: obj.id, progress: progress[obj.id], files: result.touched, protocol: PROTOCOL, agentTurns: maxTurns });
}

if (process.env.LOCAL_AI_READY !== '1') {
  console.error('[autobot] local AI unavailable; feature brain refuses paid fallback');
  process.exit(2);
}

appendAudit('feature-brain-run-started', { minutes, model, maxFeatures, maxAttemptsPerFeature, maxEdits, maxTurns, timeoutSeconds, protocol: PROTOCOL, agentic: true });
console.log(`[autobot] agentic feature brain: model=${model}; turns=${maxTurns}; edits=${maxEdits}; ${left().toFixed(1)}m available`);

for (let n = 1; n <= maxFeatures && left() > 1; n += 1) {
  const obj = choose();
  if (!obj) { console.log('[autobot] no eligible feature objective is available'); break; }
  for (let attempt = 1; attempt <= maxAttemptsPerFeature && left() > 1; attempt += 1) {
    attemptsThisRun.set(obj.id, (attemptsThisRun.get(obj.id) || 0) + 1);
    appendAudit('feature-attempt-started', { objectiveId: obj.id, attempt, protocol: PROTOCOL, agentic: true });
    console.log(`[autobot] FEATURE ${n}/${maxFeatures}: ${obj.id} — attempt ${attempt}/${maxAttemptsPerFeature}`);
    const result = runObjective(obj, attempt > 1);
    if (result.ok) {
      markSuccess(obj, result);
      console.log(`[autobot] VERIFIED increment for ${obj.id}: ${result.message}`);
      appendAudit('feature-attempt-verified', { objectiveId: obj.id, attempt, files: result.touched, progress: progress[obj.id] });
      break;
    }
    recordFailure(obj, result.message, result.touched);
    const snapshots = snapshotFiles(obj);
    restoreAttemptFiles(snapshots);
    appendAudit('feature-attempt-failed', { objectiveId: obj.id, attempt, message: result.message.slice(0, 3000), touched: result.touched });
    console.error(`[autobot] feature attempt failed; scoped recovery will preserve unrelated work: ${result.message.slice(0, 1200)}`);
  }
}

appendAudit('feature-brain-run-finished', { minutes, elapsedMinutes: Number(((Date.now() - started) / 60000).toFixed(2)), progress, protocol: PROTOCOL, agentic: true });
save();
console.log(`[autobot] agentic feature brain finished with progress: ${JSON.stringify(progress)}`);
