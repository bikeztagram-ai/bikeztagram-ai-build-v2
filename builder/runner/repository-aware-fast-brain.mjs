#!/usr/bin/env node
/**
 * Fast structured local coding brain.
 * One compact Qwen patch request replaces the expensive multi-turn tool loop.
 * The runner remains authoritative for scope, exact-match writes, syntax, diff, build and rollback.
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
const maxEdits = Math.min(2, Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_EDITS || 2)));
const maxAttempts = Math.min(2, Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || 1)));

function run(command, args = [], options = {}) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', ...options });
}
function capture(command, args) {
  try { return run(command, args); }
  catch (error) { return [error.stdout, error.stderr, error.message].filter(Boolean).join('\n'); }
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
  return (o.dependsOn || []).every((id) => progress[id] > 0 || (state.completed || []).includes(id));
}
function chooseObjective() {
  const candidates = objectives.filter((o) => dependenciesMet(o) && !progress[o.id] && !state.failed?.[o.id]);
  candidates.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return candidates[0] || null;
}
function contextFor(o) {
  const files = [];
  for (const file of o.files || []) {
    if (!safe(file)) continue;
    const entry = (map.files || []).find((x) => x.path === file);
    const content = read(file);
    const lines = content.split(/\r?\n/);
    const preview = content.length <= 3400 ? content : `${lines.slice(0, 42).join('\n')}\n/* ...middle omitted; use supplied file identity only... */\n${lines.slice(-20).join('\n')}`;
    files.push({ path: file, lines: entry?.lines || lines.length, purpose: entry?.purpose || '', code: preview.slice(0, 3600) });
  }
  return JSON.stringify({ files }, null, 2).slice(0, 7600);
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
function modelPatch(o, repair = '') {
  const body = JSON.stringify({
    model, stream: false, keep_alive: '15m', think: false,
    options: { temperature: 0, num_ctx: 4096, num_predict: 360 },
    messages: [
      { role: 'system', content: 'You are a senior software engineer. Return ONLY valid JSON. Make a small real product improvement, not a plan. Never touch infrastructure.' },
      { role: 'user', content: [
        `OBJECTIVE: ${o.title}`,
        `ACCEPTANCE: ${(o.acceptance || []).join(' | ')}`,
        `CONSTRAINTS: ${(o.constraints || []).join(' | ')}`,
        `ALLOWED FILES: ${(o.files || []).join(', ')}`,
        '',
        'REPOSITORY CONTEXT (authoritative supplied code; do not invent missing text):', contextFor(o),
        '',
        'Return exactly: {"edits":[{"file":"...","search":"exact existing text","replace":"replacement text"}],"summary":"..."}',
        `Rules: 1-${maxEdits} edits; every search string must be copied exactly from supplied code; edit only allowed files; preserve public contracts; prefer one focused improvement; no markdown; no explanations.${repair}`
      ].join('\n') }
    ]
  });
  // The feature budget is the outer safety limit. Do not silently replace it with a 55s model ceiling.
  // Leave a small margin for JSON parsing, validation and the subsequent build.
  const seconds = Math.min(150, Math.max(25, Math.floor(left() * 60) - 5));
  const requestStarted = Date.now();
  console.log(`[autobot] Qwen request start timeout=${seconds}s context=${body.length} chars model=${model}`);
  try {
    const raw = run('curl', ['-sS', '--fail', '--connect-timeout', '8', '--max-time', String(seconds), `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { timeout: (seconds + 8) * 1000 });
    console.log(`[autobot] Qwen response received in ${((Date.now() - requestStarted) / 1000).toFixed(1)}s`);
    const response = JSON.parse(raw);
    if (response.error) throw new Error(String(response.error));
    return extractJson(response?.message?.content);
  } catch (error) {
    console.error(`[autobot] Qwen request ended after ${((Date.now() - requestStarted) / 1000).toFixed(1)}s: ${error.message || error}`);
    throw error;
  }
}
function persistState() {
  const completed = Object.entries(progress).filter(([, value]) => value > 0).map(([id]) => id);
  state.progress = progress;
  state.completed = completed;
  state.failed = state.failed || {};
  state.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ version: 17, completed, progress, failed: state.failed, updatedAt: state.updatedAt }, null, 2) + '\n');
}
function apply(o, patch) {
  if (!patch || !Array.isArray(patch.edits)) return { ok: false, reason: 'invalid structured patch' };
  const allowed = new Set(o.files || []);
  const snapshots = new Map();
  for (const file of allowed) if (fs.existsSync(abs(file))) snapshots.set(file, read(file));
  let edits = 0;
  for (const item of patch.edits.slice(0, maxEdits)) {
    const file = String(item?.file || '');
    const search = String(item?.search || '');
    const replacement = String(item?.replace ?? '');
    if (!allowed.has(file) || !safe(file)) { restore(snapshots); return { ok: false, reason: `unsafe or out-of-scope file: ${file}` }; }
    const current = read(file);
    if (!current || !search) { restore(snapshots); return { ok: false, reason: `missing file/search: ${file}` }; }
    if (current.split(search).length - 1 !== 1) { restore(snapshots); return { ok: false, reason: `search must match exactly once: ${file}` }; }
    const next = current.replace(search, replacement);
    if (next === current || !next.trim()) { restore(snapshots); return { ok: false, reason: `no-op edit: ${file}` }; }
    fs.writeFileSync(abs(file), next);
    const check = syntax(file);
    if (check !== 'PASS') { restore(snapshots); return { ok: false, reason: `${check}: ${file}` }; }
    edits += 1;
  }
  if (!edits) { restore(snapshots); return { ok: false, reason: 'no product edit supplied' }; }
  const whitespace = diffCheck();
  if (whitespace !== 'PASS') { restore(snapshots); return { ok: false, reason: whitespace }; }
  const diff = productDiff();
  if (!diff.trim()) { restore(snapshots); return { ok: false, reason: 'no product diff after edit' }; }
  const check = build();
  if (check !== 'PASS') { restore(snapshots); return { ok: false, reason: check }; }
  progress[o.id] = 1;
  persistState();
  appendAudit('repository-aware-fast-feature-complete', { objectiveId: o.id, edits, summary: String(patch.summary || '').slice(0, 800) });
  return { ok: true, edits, summary: patch.summary || '' };
}

const objective = chooseObjective();
if (!objective || left() <= 0.5) { console.log('[autobot] fast brain: no eligible objective'); process.exit(0); }
console.log(`[autobot] fast brain objective=${objective.id}; model=${model}; ${left().toFixed(1)}m left`);
let result = { ok: false, reason: 'not attempted' };
for (let attempt = 1; attempt <= maxAttempts && left() > 0.5; attempt += 1) {
  try {
    const patch = modelPatch(objective, attempt > 1 ? ' Previous patch failed validation. Return a simpler patch using an exact short existing block.' : '');
    result = apply(objective, patch);
    if (result.ok) break;
    console.error(`[autobot] fast brain validation failed: ${result.reason}`);
  } catch (error) {
    result = { ok: false, reason: String(error.message || error) };
    console.error(`[autobot] fast brain model failed: ${result.reason}`);
  }
}
if (!result.ok) {
  state.failed = state.failed || {};
  state.failed[objective.id] = { attempts: maxAttempts, reason: result.reason, updatedAt: new Date().toISOString() };
  persistState();
  appendAudit('repository-aware-fast-feature-failed', { objectiveId: objective.id, attempts: maxAttempts, reason: result.reason });
  process.exitCode = 1;
} else {
  console.log(`[autobot] fast brain complete: ${objective.id} edits=${result.edits}`);
}
