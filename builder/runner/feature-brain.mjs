#!/usr/bin/env node
/** Local feature engineer using exact search/replace edits and ranked code context. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { appendAudit } from '../quality/audit-log.mjs';

const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '15', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:7b';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const timeoutSeconds = Math.max(90, Number.parseInt(process.env.LOCAL_AI_FEATURE_TIMEOUT_SECONDS || '210', 10));
const maxFeatures = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES || '1', 10));
const maxAttempts = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || '2', 10));
const maxEdits = Math.max(1, Math.min(3, Number.parseInt(process.env.AUTOBOT_FEATURE_MAX_EDITS || '2', 10)));
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const abs = p => path.join(root, p);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
const capture = (cmd, args) => { try { return run(cmd, args); } catch (e) { return [e.stdout, e.stderr, e.message].filter(Boolean).join('\n'); } };

function read(p, max = 12000) {
  const f = abs(p);
  if (!fs.existsSync(f)) return '';
  const s = fs.readFileSync(f, 'utf8');
  return s.length <= max ? s : `${s.slice(0, max)}\n...[truncated]...`;
}

const objectives = JSON.parse(read('builder/brain/feature-objectives.json', 30000)).objectives || [];
const statePath = abs('builder/working/feature-brain-state.json');
let state = { completed: [], failed: {} };
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
const completed = new Set(state.completed || []);
const attemptsThisRun = new Map();

function save() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ version: 5, completed: [...completed], failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}

function classifyFailure(message = '') {
  const m = String(message).toLowerCase();
  if (/timed out|timeout|etimedout/.test(m)) return 'timeout';
  if (/rate.?limit|429/.test(m)) return 'rate-limit';
  if (/connection refused|econnrefused|network|fetch failed|curl/.test(m)) return 'network';
  if (/search block|ambiguous|out-of-scope|schema|edit/.test(m)) return 'invalid-edit';
  if (/build|vite|syntax|module|compile/.test(m)) return 'verification-build';
  return 'implementation';
}

function dependenciesMet(obj) {
  return (obj.dependsOn || []).every(dep => completed.has(dep) || !objectives.some(o => o.id === dep));
}

function keywords(obj) {
  return [...new Set(`${obj.title} ${(obj.acceptance || []).join(' ')} ${(obj.constraints || []).join(' ')}`.toLowerCase().match(/[a-z][a-z0-9]{3,}/g) || [])];
}

function symbolLines(lines) {
  const out = [];
  const re = /(?:export\s+)?(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)|(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/;
  for (let i = 0; i < lines.length; i++) { const m = lines[i].match(re); if (m) out.push({ line: i, name: m[1] || m[2] }); }
  return out;
}

function rankedSource(p, obj) {
  const source = fs.existsSync(abs(p)) ? fs.readFileSync(abs(p), 'utf8') : '';
  const lines = source.split(/\r?\n/);
  const terms = keywords(obj);
  const symbols = symbolLines(lines).map(s => ({ ...s, score: terms.reduce((n, t) => n + (s.name.toLowerCase().includes(t) ? 8 : 0), 0) }));
  const anchors = symbols.sort((a, b) => b.score - a.score || a.line - b.line).slice(0, 5);
  const windows = [];
  const add = (a, b) => { a = Math.max(0, a); b = Math.min(lines.length, b); if (b <= a) return; const text = lines.slice(a, b).map((x, i) => `${String(a + i + 1).padStart(4, ' ')}| ${x}`).join('\n'); if (!windows.includes(text)) windows.push(text); };
  add(0, Math.min(28, lines.length));
  for (const a of anchors) add(a.line - 5, a.line + 28);
  if (windows.length === 1 && lines.length > 60) add(lines.length - 28, lines.length);
  let out = windows.join('\n...\n');
  if (out.length > 5200) out = out.slice(0, 5200) + '\n...[context trimmed]...';
  return `===== ${p} =====\n${out}`;
}

function context(obj, repair = false) {
  const chunks = [`OBJECTIVE: ${obj.title}\nPriority: ${obj.priority}\nDependencies: ${(obj.dependsOn || []).join(', ') || 'none'}\nAcceptance:\n- ${(obj.acceptance || []).join('\n- ')}\nConstraints:\n- ${(obj.constraints || []).join('\n- ')}\n\nMake ONE small coherent production increment. Prefer one function or one nearby block. Do not redesign the subsystem.`];
  for (const p of obj.files) chunks.push(rankedSource(p, obj));
  chunks.push(`===== PROJECT MEMORY =====\n${read('builder/quality/project-memory.md', 1300)}`);
  chunks.push(`===== LESSONS =====\n${read('builder/quality/lessons.md', 900)}`);
  if (repair) { const f = state.failed?.[obj.id]; chunks.push(`===== PREVIOUS FAILURE EVIDENCE =====\n${String(f?.message || 'none').slice(0, 2500)}\n\n${String(f?.diff || '').slice(0, 4500)}`); }
  return chunks.join('\n\n').slice(0, 14500);
}

function choose() {
  const available = objectives.filter(o => !completed.has(o.id) && dependenciesMet(o) && (attemptsThisRun.get(o.id) || 0) < maxAttempts);
  if (!available.length) return null;
  return available.sort((a, b) => {
    const af = state.failed?.[a.id]?.attempts || 0, bf = state.failed?.[b.id]?.attempts || 0;
    return ((b.priority || 0) - bf * 10) - ((a.priority || 0) - af * 10);
  })[0];
}

const editSchema = {
  type: 'object', additionalProperties: false,
  properties: { edits: { type: 'array', minItems: 1, maxItems: maxEdits, items: {
    type: 'object', additionalProperties: false,
    properties: { file: { type: 'string' }, search: { type: 'string', minLength: 1, maxLength: 2800 }, replace: { type: 'string', maxLength: 4200 } },
    required: ['file', 'search', 'replace']
  } } },
  required: ['edits']
};

function parseStructured(stdout) {
  let content = '';
  for (const line of stdout.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    let part; try { part = JSON.parse(line); } catch { continue; }
    if (part.error) throw new Error(String(part.error));
    if (part.message?.content) content = part.message.content;
  }
  if (!content) throw new Error('local model returned no structured edit response');
  try { return JSON.parse(content); } catch (e) { throw new Error(`structured search-replace JSON parse failed: ${e.message}`); }
}

function modelCall(obj, repair = false) {
  const failure = state.failed?.[obj.id];
  const prompt = `You are the implementation engineer for Bikeztagram AI. Make ONE real production-quality increment of the stated objective. Modify ONLY the listed product files. Never modify builder infrastructure, workflows, secrets, Vercel configuration, package dependencies, or protected paths.

EDIT PROTOCOL: return ONLY JSON matching the schema. Each edit is {file,search,replace}. SEARCH must be copied literally from the supplied source, including whitespace and punctuation, and must occur exactly once. REPLACE is the complete new block. Never use line numbers, unified diff markers, markdown fences, ellipses, placeholders, or commentary. Use at most ${maxEdits} small edits and prefer one edit in one file. Do not rewrite an entire file.

The runner applies exact replacements, runs git diff --check, then npm run build. If verification fails the change is discarded. ${repair ? `A previous attempt failed (${failure?.class || 'unknown'}). Correct that specific failure. Evidence: ${String(failure?.message || 'unknown').slice(0, 1800)}` : 'Choose the smallest safe change that clearly advances one acceptance criterion.'}

${context(obj, repair)}`;
  const body = JSON.stringify({ model, stream: false, keep_alive: '15m', format: editSchema, options: { temperature: 0, num_ctx: 12288, num_predict: 2400 }, messages: [
    { role: 'system', content: 'You are a careful senior JavaScript/React engineer. Output only the requested JSON search-replace edits.' },
    { role: 'user', content: prompt }
  ] });
  const sec = Math.min(timeoutSeconds, Math.max(60, Math.floor(left() * 60)));
  return new Promise((resolve, reject) => {
    const child = spawn('curl', ['-sS', '--fail', '--connect-timeout', '15', '--max-time', String(sec), `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { cwd: root });
    let stdout = '', stderr = '', settled = false;
    const timer = setTimeout(() => { try { child.kill('SIGTERM'); } catch {} finish(new Error(`local model request timed out after ${sec}s`)); }, sec * 1000 + 2000);
    const finish = (err, value) => { if (settled) return; settled = true; clearTimeout(timer); err ? reject(err) : resolve(value); };
    child.stdout.on('data', d => { stdout += d.toString(); }); child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', e => finish(e));
    child.on('close', (code, signal) => { if (code !== 0) return finish(new Error(stderr.trim() || `local model request failed (${code || signal || 'unknown'})`)); try { finish(null, parseStructured(stdout)); } catch (e) { finish(e); } });
  });
}

function validateEdits(payload, obj) {
  if (!payload || !Array.isArray(payload.edits) || payload.edits.length < 1 || payload.edits.length > maxEdits) throw new Error('structured response contains no valid search-replace edit list');
  const allowed = new Set(obj.files), seen = new Set(); let totalSearch = 0, totalReplace = 0;
  for (const e of payload.edits) {
    if (!allowed.has(e.file)) throw new Error(`edit targets out-of-scope file: ${e.file}`);
    if (seen.has(e.file)) throw new Error(`multiple edits in one file are disabled for safety: ${e.file}`); seen.add(e.file);
    if (!e.search?.trim()) throw new Error(`empty search block for ${e.file}`);
    const full = fs.readFileSync(abs(e.file), 'utf8'); const count = full.split(e.search).length - 1;
    if (count !== 1) throw new Error(`search block for ${e.file} must match exactly once (found ${count})`);
    if (e.search.length > 2800 || e.replace.length > 4200) throw new Error(`edit block too large for ${e.file}`);
    if (/[\u0000]/.test(e.search) || /\b(?:<<<<<<<|>>>>>>>|@@\s)/.test(e.search)) throw new Error(`diff/binary markers forbidden in ${e.file}`);
    totalSearch += e.search.length; totalReplace += e.replace.length;
  }
  if (totalSearch > 5200 || totalReplace > 7000) throw new Error('combined edit payload too large; use a smaller increment');
}

function applyEdits(payload) {
  const next = new Map();
  for (const e of payload.edits) {
    const current = next.has(e.file) ? next.get(e.file) : fs.readFileSync(abs(e.file), 'utf8');
    if (current.split(e.search).length - 1 !== 1) throw new Error(`search block stopped being unique while applying ${e.file}`);
    next.set(e.file, current.replace(e.search, e.replace));
  }
  for (const [p, content] of next) fs.writeFileSync(abs(p), content);
}

function resetFailedEdits() { run('git', ['reset', '--hard', 'HEAD'], { stdio: 'inherit' }); run('git', ['clean', '-fd', '-e', '.git'], { stdio: 'inherit' }); }

if (process.env.LOCAL_AI_READY !== '1') { console.error('[autobot] local AI unavailable; feature brain refuses paid fallback'); process.exit(2); }
appendAudit('feature-brain-run-started', { minutes, model, maxFeatures, maxAttempts, maxEdits, timeoutSeconds, protocol: 'structured-search-replace-v2', completed: [...completed] });

for (let n = 1; n <= maxFeatures && left() > 1; n++) {
  const obj = choose(); if (!obj) { console.log('[autobot] no eligible feature objective is available in this run'); break; }
  for (let attempt = 1; attempt <= maxAttempts && left() > 1; attempt++) {
    attemptsThisRun.set(obj.id, (attemptsThisRun.get(obj.id) || 0) + 1);
    console.log(`[autobot] FEATURE ${n}/${maxFeatures}: ${obj.id} — attempt ${attempt}/${maxAttempts} — ${left().toFixed(1)}m remaining — model=${model}`);
    try {
      const payload = await modelCall(obj, attempt > 1); validateEdits(payload, obj); applyEdits(payload);
      run('git', ['diff', '--check'], { stdio: 'inherit' });
      run('npm', ['run', 'build'], { stdio: 'inherit', timeout: Math.min(900000, Math.max(60000, Math.floor(left() * 60000))) });
      completed.add(obj.id); if (state.failed) delete state.failed[obj.id]; save();
      appendAudit('feature-verified', { objectiveId: obj.id, attempt, edits: payload.edits.length, protocol: 'structured-search-replace-v2' });
      console.log(`[autobot] VERIFIED FEATURE: ${obj.id}`); break;
    } catch (e) {
      const failureClass = classifyFailure(e.message); const diff = capture('git', ['diff', '--no-ext-diff']); state.failed ||= {};
      state.failed[obj.id] = { ...(state.failed[obj.id] || {}), message: e.message, class: failureClass, diff: diff.slice(0, 5000), at: new Date().toISOString(), attempts: (state.failed[obj.id]?.attempts || 0) + 1 };
      save(); appendAudit('feature-failed', { objectiveId: obj.id, attempt, failureClass, message: e.message, protocol: 'structured-search-replace-v2' });
      try { resetFailedEdits(); } catch (r) { console.error(`[autobot] reset failed: ${r.message}`); process.exit(2); }
      console.error(`[autobot] feature ${obj.id} failed and was reset (${failureClass}): ${e.message}`);
      if (attempt >= maxAttempts || left() <= 3) break;
    }
  }
}

appendAudit('feature-brain-run-finished', { completed: [...completed], attemptedThisRun: [...attemptsThisRun.entries()], elapsedMinutes: Number(((Date.now() - started) / 60000).toFixed(2)), protocol: 'structured-search-replace-v2' });
save();
