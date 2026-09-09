#!/usr/bin/env node
/**
 * Fast structured local coding brain.
 * Qwen proposes one small product edit; the runner remains authoritative for
 * scope, exact-match writes, syntax, diff, build and rollback.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { appendAudit } from '../quality/audit-log.mjs';

const root = process.cwd();
const minutes = Number(process.env.BUILDER_MAX_MINUTES || 6);
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const abs = file => path.join(root, file);
const model = process.env.LOCAL_AI_MODEL || 'qwen3:4b-instruct-2507-q4_K_M';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const maxEdits = 1;
const maxAttempts = 1;
const NUM_CTX = 3072;
const NUM_PREDICT = 240;

function run(command, args = [], options = {}) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', ...options });
}
function read(file) {
  try { return fs.readFileSync(abs(file), 'utf8'); } catch { return ''; }
}
function safe(file) {
  return Boolean(file) && !file.includes('..') && !file.startsWith('/') && !/(^|\/)(\.env(?:\..*)?|.*(?:secret|credential|token|private).*|.*\.pem)$/i.test(file);
}
function syntax(file) {
  if (!/\.(js|mjs|cjs|jsx)$/.test(file)) return 'PASS';
  try { run(process.execPath, ['--check', file]); return 'PASS'; }
  catch (e) { return `FAIL ${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(-3000)}`; }
}
function build() {
  try { run('npm', ['run', 'build']); return 'PASS'; }
  catch (e) { return `FAIL ${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(-5000)}`; }
}
function diffCheck() {
  try { run('git', ['diff', '--check']); return 'PASS'; }
  catch (e) { return `FAIL ${[e.stdout, e.stderr, e.message].filter(Boolean).join('\n').slice(-3000)}`; }
}
function productDiff() {
  try { return run('git', ['diff', '--', 'src', 'public']); }
  catch (e) { return [e.stdout, e.stderr, e.message].filter(Boolean).join('\n'); }
}
function restore(snapshots) {
  for (const [file, snapshot] of snapshots) fs.writeFileSync(abs(file), snapshot);
}

const map = JSON.parse(read('builder/working/repository-map.json') || '{"files":[]}');
const objectives = JSON.parse(read('builder/brain/feature-objectives.json') || '{"objectives":[]}').objectives || [];
const statePath = abs('builder/working/feature-brain-state.json');
let state = { completed: [], progress: {}, failed: {} };
try { state = JSON.parse(read('builder/working/feature-brain-state.json')); } catch {}
const progress = { ...(state.progress || {}) };
for (const id of state.completed || []) progress[id] = Math.max(progress[id] || 0, 1);

function dependenciesMet(o) {
  return (o.dependsOn || []).every(id => progress[id] > 0 || (state.completed || []).includes(id));
}
function chooseObjective() {
  const candidates = objectives.filter(o => dependenciesMet(o) && !progress[o.id] && !state.failed?.[o.id]);
  candidates.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return candidates[0] || null;
}
function compactCode(content, limit = 1200) {
  if (content.length <= limit) return content;
  const lines = content.split(/\r?\n/);
  const head = lines.slice(0, 14).join('\n');
  const tail = lines.slice(-8).join('\n');
  return `${head}\n/* omitted middle: do not edit against omitted text */\n${tail}`.slice(0, limit);
}
function contextFor(o) {
  const files = [];
  for (const file of o.files || []) {
    if (!safe(file)) continue;
    const entry = (map.files || []).find(x => x.path === file);
    const content = read(file);
    const lines = content.split(/\r?\n/);
    files.push({ path: file, lines: entry?.lines || lines.length, purpose: entry?.purpose || '', code: compactCode(content) });
  }
  return JSON.stringify({ files }, null, 2).slice(0, 5200);
}
function extractJson(text) {
  const clean = String(text || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)); } catch {}
  }
  return null;
}
function modelPatch(o) {
  const schema = {
    type: 'object', additionalProperties: false,
    properties: {
      edits: { type: 'array', maxItems: 1, minItems: 1, items: {
        type: 'object', additionalProperties: false,
        properties: { file: { type: 'string' }, search: { type: 'string', minLength: 12 }, replace: { type: 'string', minLength: 12 } },
        required: ['file', 'search', 'replace']
      }},
      summary: { type: 'string', maxLength: 240 }
    },
    required: ['edits', 'summary']
  };
  const body = JSON.stringify({
    model, stream: false, keep_alive: '15m', think: false, format: schema,
    options: { temperature: 0, num_ctx: NUM_CTX, num_predict: NUM_PREDICT },
    messages: [
      { role: 'system', content: 'You are a careful senior engineer editing an existing JavaScript product. Return one tiny verified-safe patch. Do not plan. Do not rewrite files. Never touch infrastructure.' },
      { role: 'user', content: [
        `OBJECTIVE: ${o.title}`,
        `ACCEPTANCE: ${(o.acceptance || []).join(' | ')}`,
        `CONSTRAINTS: ${(o.constraints || []).join(' | ')}`,
        `ALLOWED FILES: ${(o.files || []).join(', ')}`,
        '', 'AUTHORITATIVE CODE CONTEXT:', contextFor(o), '',
        'EDIT RULES:',
        '1. Make exactly ONE small production improvement.',
        '2. Prefer replacing ONE complete existing line or short complete statement.',
        '3. Copy search EXACTLY from the supplied code. Never invent omitted text.',
        '4. replace must be complete valid code, never fragments, ellipses, placeholders, or partial expressions.',
        '5. Do not change imports, exports, public function signatures, or infrastructure unless the objective explicitly requires it.',
        '6. If a safe improvement cannot be made from the supplied code, return the smallest safe existing-line improvement rather than guessing.',
        '', 'Return only the JSON object required by the schema.'
      ].join('\n') }
    ]
  });
  const seconds = Math.min(110, Math.max(30, Math.floor(left() * 60) - 5));
  const requestStarted = Date.now();
  console.log(`[autobot] Qwen request start timeout=${seconds}s ctx=${NUM_CTX} predict=${NUM_PREDICT} body=${body.length} chars model=${model}`);
  try {
    const raw = run('curl', ['-sS', '--fail', '--connect-timeout', '8', '--max-time', String(seconds), `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { timeout: (seconds + 8) * 1000 });
    const elapsed = (Date.now() - requestStarted) / 1000;
    console.log(`[autobot] Qwen response received in ${elapsed.toFixed(1)}s`);
    const response = JSON.parse(raw);
    if (response.error) throw new Error(String(response.error));
    appendAudit('repository-aware-fast-qwen-response', { objectiveId: o.id, seconds: Number(elapsed.toFixed(1)), outputChars: String(response?.message?.content || '').length });
    return extractJson(response?.message?.content);
  } catch (error) {
    const elapsed = (Date.now() - requestStarted) / 1000;
    console.error(`[autobot] Qwen request ended after ${elapsed.toFixed(1)}s: ${error.message || error}`);
    appendAudit('repository-aware-fast-qwen-timeout', { objectiveId: o.id, seconds: Number(elapsed.toFixed(1)), reason: String(error.message || error).slice(0, 500) });
    throw error;
  }
}
function persistState() {
  const completed = Object.entries(progress).filter(([, value]) => value > 0).map(([id]) => id);
  state.progress = progress; state.completed = completed; state.failed = state.failed || {}; state.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ version: 18, completed, progress, failed: state.failed, updatedAt: state.updatedAt }, null, 2) + '\n');
}
function apply(o, patch) {
  if (!patch || !Array.isArray(patch.edits) || patch.edits.length !== 1) return { ok: false, reason: 'expected exactly one structured edit' };
  const allowed = new Set(o.files || []);
  const snapshots = new Map();
  for (const file of allowed) if (fs.existsSync(abs(file))) snapshots.set(file, read(file));
  const item = patch.edits[0];
  const file = String(item?.file || ''), search = String(item?.search || ''), replacement = String(item?.replace ?? '');
  if (!allowed.has(file) || !safe(file)) { restore(snapshots); return { ok: false, reason: `unsafe or out-of-scope file: ${file}` }; }
  if (search.includes('...omitted') || replacement.includes('...omitted') || replacement.includes('TODO')) { restore(snapshots); return { ok: false, reason: 'placeholder edit rejected' }; }
  if (search.length > 1600 || replacement.length > 1600) { restore(snapshots); return { ok: false, reason: 'edit too large for fast brain' }; }
  const current = read(file);
  if (!current || search.length < 12) { restore(snapshots); return { ok: false, reason: `missing file/search: ${file}` }; }
  if (current.split(search).length - 1 !== 1) { restore(snapshots); return { ok: false, reason: `search must match exactly once: ${file}` }; }
  const next = current.replace(search, replacement);
  if (next === current || !next.trim()) { restore(snapshots); return { ok: false, reason: `no-op edit: ${file}` }; }
  fs.writeFileSync(abs(file), next);
  const check = syntax(file);
  if (check !== 'PASS') { restore(snapshots); return { ok: false, reason: `${check}: ${file}` }; }
  if (diffCheck() !== 'PASS') { restore(snapshots); return { ok: false, reason: 'whitespace diff check failed' }; }
  if (!productDiff().trim()) { restore(snapshots); return { ok: false, reason: 'no product diff after edit' }; }
  const built = build();
  if (built !== 'PASS') { restore(snapshots); return { ok: false, reason: built }; }
  progress[o.id] = 1; persistState();
  appendAudit('repository-aware-fast-feature-complete', { objectiveId: o.id, edits: 1, summary: String(patch.summary || '').slice(0, 240) });
  return { ok: true, edits: 1, summary: patch.summary || '' };
}

const objective = chooseObjective();
if (!objective || left() <= 0.5) { console.log('[autobot] fast brain: no eligible objective'); process.exit(0); }
console.log(`[autobot] fast brain objective=${objective.id}; model=${model}; ${left().toFixed(1)}m left`);
let result = { ok: false, reason: 'not attempted' };
try { result = apply(objective, modelPatch(objective)); }
catch (error) { result = { ok: false, reason: String(error.message || error) }; console.error(`[autobot] fast brain model failed: ${result.reason}`); }
if (!result.ok) {
  state.failed = state.failed || {};
  state.failed[objective.id] = { attempts: maxAttempts, reason: result.reason, updatedAt: new Date().toISOString() };
  persistState();
  appendAudit('repository-aware-fast-feature-failed', { objectiveId: objective.id, attempts: maxAttempts, reason: result.reason });
  process.exitCode = 1;
} else console.log(`[autobot] fast brain complete: ${objective.id} edits=${result.edits}`);
