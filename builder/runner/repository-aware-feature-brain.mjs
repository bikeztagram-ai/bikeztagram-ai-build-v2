#!/usr/bin/env node
/**
 * Repository-aware local coding agent for Bikeztagram AI.
 * Deterministic context routing, narrow writes, bounded verification.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { appendAudit } from '../quality/audit-log.mjs';

const root = process.cwd();
const minutes = Number(process.env.BUILDER_MAX_MINUTES || 15);
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const abs = (file) => path.join(root, file);
const model = process.env.LOCAL_AI_MODEL || 'qwen3:4b';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const maxEdits = Math.min(6, Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_EDITS || 3)));
const maxTurns = Math.min(10, Math.max(4, Number(process.env.AUTOBOT_AGENT_TURNS || 8)));
const maxFeatures = Math.max(1, Number(process.env.AUTOBOT_FEATURE_PASSES || 1));
const maxAttempts = Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || 2));
const PROTOCOL = 'repository-aware-agent-v7';

function run(command, args = [], options = {}) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', ...options });
}
function capture(command, args) {
  try { return run(command, args); }
  catch (error) { return [error.stdout, error.stderr, error.message].filter(Boolean).join('\n'); }
}
function read(file) {
  try { return fs.readFileSync(abs(file), 'utf8'); }
  catch { return ''; }
}
function isSensitive(file) {
  return /(^|\/)(\.env(?:\..*)?|.*(?:secret|credential|token|private).*|.*\.pem)$/i.test(file);
}
function isSafeRepoFile(file) {
  if (!file || file.includes('..') || file.startsWith('/') || isSensitive(file)) return false;
  return (repo.files || []).some((entry) => entry.path === file);
}

const mapPath = abs('builder/working/repository-map.json');
if (!fs.existsSync(mapPath)) run(process.execPath, ['builder/runner/repository-index.mjs']);
const repo = JSON.parse(read('builder/working/repository-map.json'));
const objectives = JSON.parse(read('builder/brain/feature-objectives.json')).objectives || [];
const statePath = abs('builder/working/feature-brain-state.json');
let state = { completed: [], progress: {}, failed: {} };
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
const progress = { ...(state.progress || {}) };
for (const id of state.completed || []) progress[id] = Math.max(progress[id] || 0, 1);
const attempts = new Map();

function saveState() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ version: 13, completed: [], progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}
function dependenciesMet(objective) {
  return (objective.dependsOn || []).every((dependency) => progress[dependency] > 0 || (state.completed || []).includes(dependency));
}
function chooseObjective() {
  const available = objectives.filter((objective) => dependenciesMet(objective) && (attempts.get(objective.id) || 0) < maxAttempts);
  available.sort((a, b) => {
    const score = (o) => (o.priority || 0) - (progress[o.id] || 0) * 12 - (state.failed?.[o.id]?.attempts || 0) * 8;
    return score(b) - score(a);
  });
  return available[0] || null;
}
function allowedFile(file, objective) { return new Set(objective.files || []).has(file); }
function gitStatus() { return capture('git', ['status', '--short']).slice(0, 5000); }
function gitDiff() { return capture('git', ['diff', '--', 'src', 'public']).slice(0, 12000); }

function objectiveContext(objective) {
  const files = [];
  for (const file of objective.files || []) {
    if (!isSafeRepoFile(file)) continue;
    const content = read(file);
    files.push({ path: file, lines: content.split(/\r?\n/).length - 1, content: content.slice(0, 12000) });
  }
  const edges = (repo.dependencyEdges || []).filter((edge) =>
    (objective.files || []).includes(edge.from) || (objective.files || []).includes(edge.to)
  ).slice(0, 40);
  return JSON.stringify({ summary: repo.summary, files, dependencyEdges: edges }, null, 2).slice(0, 32000);
}

function readFileWindow(file, start = 1, end = 120, objective) {
  file = String(file || '');
  if (!isSafeRepoFile(file)) return 'ERROR: file is not an indexed, non-sensitive repository file.';
  if (!allowedFile(file, objective)) return 'ERROR: read outside the objective scope is disabled. Use the supplied objective context.';
  const lines = read(file).split(/\r?\n/);
  const first = Math.max(1, Number(start) || 1);
  const last = Math.min(lines.length, first + 119, Number(end) || first + 119);
  return lines.slice(first - 1, last).map((line, index) => `${String(first + index).padStart(4, ' ')}| ${line}`).join('\n').slice(0, 9000);
}
function syntaxCheck(file) {
  if (!/\.(js|mjs|cjs|jsx)$/.test(file)) return 'PASS';
  try { run(process.execPath, ['--check', file]); return 'PASS'; }
  catch (error) { return `FAIL ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(0, 3000)}`; }
}
function editFile(file, search, replacement, objective) {
  file = String(file || '');
  if (!allowedFile(file, objective)) return 'ERROR: out-of-scope write. Only objective files may be edited.';
  if (isSensitive(file) || file.includes('..') || file.startsWith('/')) return 'ERROR: unsafe path.';
  const current = read(file);
  if (!current) return `ERROR: file not found: ${file}`;
  if (!search || typeof replacement !== 'string') return 'ERROR: search and replacement are required.';
  const matches = current.split(search).length - 1;
  if (matches !== 1) return `ERROR: exact search must match once; found ${matches}. Read the relevant window and retry with a smaller unique block.`;
  const next = current.replace(search, replacement);
  if (next === current || !next.trim()) return 'ERROR: no-op or empty edit refused.';
  fs.writeFileSync(abs(file), next);
  const syntax = syntaxCheck(file);
  if (syntax !== 'PASS') return `${syntax}; repair the file before continuing.`;
  return `EDIT APPLIED: ${file}`;
}
function runCheck(check) {
  try {
    if (check === 'build') run('npm', ['run', 'build']);
    else if (check === 'diff-check') run('git', ['diff', '--check']);
    else if (check === 'changed-syntax') {
      const files = capture('git', ['diff', '--name-only', '--', 'src', 'public']).split(/\r?\n/).filter(Boolean);
      for (const file of files) if (syntaxCheck(file) !== 'PASS') throw new Error(`syntax failed: ${file}`);
    } else return `ERROR: unsupported check ${check}`;
    return 'PASS';
  } catch (error) {
    return `FAIL ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(-7000)}`;
  }
}

// Deliberately small tool surface. Repository discovery is deterministic and
// objective context is supplied up front; the model must spend turns coding,
// verifying, and repairing instead of wandering into ignored/sensitive paths.
const tools = [
  { type: 'function', function: { name: 'read_file', description: 'Read another window from an objective-scoped file already supplied in context.', parameters: { type: 'object', required: ['file'], properties: { file: { type: 'string' }, start: { type: 'integer' }, end: { type: 'integer' } } } } },
  { type: 'function', function: { name: 'git_status', description: 'Inspect working tree status.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'git_diff', description: 'Inspect the current product diff.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'edit_file', description: 'Replace one exact block in an objective file only.', parameters: { type: 'object', required: ['file', 'search', 'replace'], properties: { file: { type: 'string' }, search: { type: 'string' }, replace: { type: 'string' } } } } },
  { type: 'function', function: { name: 'run_check', description: 'Run bounded verification.', parameters: { type: 'object', required: ['check'], properties: { check: { type: 'string', enum: ['build', 'diff-check', 'changed-syntax'] } } } } },
  { type: 'function', function: { name: 'submit', description: 'Submit only after a real product edit has been verified.', parameters: { type: 'object', required: ['summary'], properties: { summary: { type: 'string' } } } } }
];

function modelCall(messages) {
  const seconds = Math.min(180, Math.max(45, Math.floor(left() * 60)));
  const body = JSON.stringify({
    model,
    stream: false,
    keep_alive: '15m',
    think: false,
    tools,
    options: { temperature: 0, num_ctx: 4096, num_predict: 900 },
    messages
  });
  const raw = run('curl', ['-sS', '--fail', '--connect-timeout', '10', '--max-time', String(seconds), `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { timeout: (seconds + 10) * 1000 });
  const response = JSON.parse(raw);
  if (response.error) throw new Error(String(response.error));
  return response;
}
function parseToolCalls(response) {
  const native = (response?.message?.tool_calls || []).map((call) => ({
    name: call.function?.name,
    args: typeof call.function?.arguments === 'string' ? JSON.parse(call.function.arguments) : (call.function?.arguments || {})
  }));
  if (native.length) return native;
  const content = String(response?.message?.content || '');
  const fallback = [];
  for (const match of content.matchAll(/<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.name) fallback.push({ name: parsed.name, args: parsed.arguments || {} });
    } catch {}
  }
  return fallback;
}

function executeObjective(objective, repair) {
  const snapshots = new Map();
  for (const file of objective.files || []) if (fs.existsSync(abs(file))) snapshots.set(file, read(file));
  let editCount = 0;
  let submitted = false;
  let summary = '';
  let emptyTurns = 0;
  const context = objectiveContext(objective);
  const prompt = [
    'You are the senior autonomous engineer for Bikeztagram AI. You are operating on the real repository.',
    `OBJECTIVE: ${objective.title}`,
    `PRIORITY: ${objective.priority}`,
    `VERIFIED PROGRESS: ${progress[objective.id] || 0}`,
    `DEPENDENCIES: ${(objective.dependsOn || []).join(', ') || 'none'}`,
    '',
    'DETERMINISTIC OBJECTIVE CONTEXT (authoritative; no repository search is needed):',
    context,
    '',
    'ACCEPTANCE:',
    ...(objective.acceptance || []).map((item) => `- ${item}`),
    'CONSTRAINTS:',
    ...(objective.constraints || []).map((item) => `- ${item}`),
    'OBJECTIVE WRITE SCOPE:',
    ...(objective.files || []).map((file) => `- ${file}`),
    '',
    'OPERATING RULES:',
    '1. Do useful engineering, not a plan or explanation.',
    '2. The objective files above are already provided. Start by reading a supplied file window only if you need more detail, otherwise edit a focused block immediately.',
    '3. Make the smallest meaningful product improvement that advances the acceptance criteria.',
    '4. After editing, run a build or diff check. If it fails, diagnose the failure and repair the edit.',
    '5. Submit only after a real product-source edit is present and verified.',
    '6. You cannot search the repository. You cannot read .env, secrets, builder state, workflows, dependencies, or other infrastructure.',
    '7. Never reset, clean, revert, or discard unrelated working-tree changes.',
    `8. You have at most ${maxEdits} edits. Do not waste turns on discovery.`,
    repair ? 'This is a repair attempt. Inspect the current objective state and fix the previous failure; do not repeat the same failed action.' : ''
  ].join('\n');
  const messages = [
    { role: 'system', content: 'You are a concise, tool-using senior software engineer. Act through tools. Do not provide prose instead of a tool call.' },
    { role: 'user', content: prompt }
  ];

  for (let turn = 1; turn <= maxTurns && left() > 0.75; turn += 1) {
    console.log(`[autobot] agent turn ${turn}/${maxTurns}; edits=${editCount}/${maxEdits}; ${left().toFixed(1)}m left`);
    let response;
    try {
      response = modelCall(messages);
    } catch (error) {
      console.error(`[autobot] model call failed: ${error.message}`);
      if (turn < maxTurns) {
        messages.push({ role: 'user', content: 'Tool request failed. Do not explain. Make the next response a direct tool call on an objective file, preferably edit_file or run_check.' });
        continue;
      }
      break;
    }
    const assistant = response.message || { role: 'assistant', content: '' };
    messages.push(assistant);
    const calls = parseToolCalls(response);
    if (!calls.length) {
      emptyTurns += 1;
      if (emptyTurns >= 2) {
        console.error('[autobot] model produced prose without a usable tool call twice; stopping this attempt.');
        break;
      }
      messages.push({ role: 'user', content: 'No usable tool call was received. Do not write prose. Call read_file, edit_file, run_check, git_diff, git_status, or submit now.' });
      continue;
    }
    emptyTurns = 0;
    for (const call of calls) {
      if (call.name === 'submit') {
        submitted = true;
        summary = String(call.args.summary || '').slice(0, 1000);
        messages.push({ role: 'tool', content: 'Submission received. Runner verification is authoritative.' });
        continue;
      }
      let result;
      if (call.name === 'read_file') result = readFileWindow(call.args.file, call.args.start, call.args.end, objective);
      else if (call.name === 'git_status') result = gitStatus();
      else if (call.name === 'git_diff') result = gitDiff();
      else if (call.name === 'run_check') result = runCheck(call.args.check);
      else if (call.name === 'edit_file') {
        if (editCount >= maxEdits) result = `ERROR: edit budget exhausted (${maxEdits}). Verify or submit.`;
        else {
          result = editFile(call.args.file, call.args.search, call.args.replace, objective);
          if (result.startsWith('EDIT APPLIED')) editCount += 1;
        }
      } else result = `ERROR: unknown tool ${call.name}`;
      console.log(`[autobot] ${call.name}: ${result.slice(0, 900).replace(/\n/g, ' ')}`);
      messages.push({ role: 'tool', content: result.slice(0, 9000) });
    }
    if (submitted) break;
  }

  if (!submitted) {
    for (const [file, snapshot] of snapshots) if (read(file) !== snapshot) fs.writeFileSync(abs(file), snapshot);
    return { ok: false, reason: 'agent did not submit', edits: editCount };
  }
  const diff = gitDiff();
  if (!diff.trim() || editCount < 1) {
    for (const [file, snapshot] of snapshots) if (read(file) !== snapshot) fs.writeFileSync(abs(file), snapshot);
    return { ok: false, reason: 'submission had no verified product diff', edits: editCount };
  }
  const build = runCheck('build');
  const diffCheck = runCheck('diff-check');
  if (build !== 'PASS' || diffCheck !== 'PASS') {
    for (const [file, snapshot] of snapshots) if (read(file) !== snapshot) fs.writeFileSync(abs(file), snapshot);
    return { ok: false, reason: `verification failed: ${build} / ${diffCheck}`, edits: editCount };
  }
  progress[objective.id] = Math.max(progress[objective.id] || 0, 1);
  saveState();
  appendAudit('repository-aware-feature-complete', { protocol: PROTOCOL, objectiveId: objective.id, summary, edits: editCount });
  return { ok: true, objective: objective.id, summary, edits: editCount };
}

let completed = 0;
for (let feature = 0; feature < maxFeatures && left() > 1; feature += 1) {
  const objective = chooseObjective();
  if (!objective) break;
  attempts.set(objective.id, (attempts.get(objective.id) || 0) + 1);
  const result = executeObjective(objective, attempts.get(objective.id) > 1);
  if (result.ok) {
    completed += 1;
    console.log(`[autobot] feature complete: ${result.objective} edits=${result.edits}`);
  } else {
    state.failed = state.failed || {};
    state.failed[objective.id] = { attempts: attempts.get(objective.id), reason: result.reason, updatedAt: new Date().toISOString() };
    saveState();
    console.error(`[autobot] feature failed: ${objective.id} ${result.reason}`);
  }
}
console.log(`[autobot] repository-aware feature brain finished: completed=${completed}`);
if (completed === 0 && maxFeatures > 0) process.exitCode = 1;
