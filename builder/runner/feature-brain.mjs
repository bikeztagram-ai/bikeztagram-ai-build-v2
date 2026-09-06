#!/usr/bin/env node
/**
 * Feature-level local engineer.
 * Uses Ollama structured output to produce bounded line edits instead of asking
 * a small local model to hand-author a fragile unified git diff.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { appendAudit } from '../quality/audit-log.mjs';

const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '15', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const timeoutSeconds = Math.max(90, Number.parseInt(process.env.LOCAL_AI_FEATURE_TIMEOUT_SECONDS || '240', 10));
const maxFeatures = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES || '1', 10));
const maxAttemptsPerFeature = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || '2', 10));
const maxEdits = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_MAX_EDITS || '6', 10));
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const file = p => path.join(root, p);
const read = (p, max = 12000) => {
  const f = file(p);
  if (!fs.existsSync(f)) return '';
  const s = fs.readFileSync(f, 'utf8');
  return s.length <= max ? s : `${s.slice(0, max)}\n...[truncated]...`;
};
const numbered = (p, max = 4200) => {
  const text = read(p, max);
  return text.split(/\r?\n/).map((line, i) => `${String(i + 1).padStart(4, ' ')}| ${line}`).join('\n');
};
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });

const objectives = JSON.parse(read('builder/brain/feature-objectives.json', 30000)).objectives || [];
const statePath = file('builder/working/feature-brain-state.json');
let state = { completed: [], failed: {} };
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
const completed = new Set(state.completed || []);
const attemptsThisRun = new Map();

function save() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ version: 4, completed: [...completed], failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}

function classifyFailure(message = '') {
  const m = String(message).toLowerCase();
  if (/timed out|timeout|etimedout/.test(m)) return 'timeout';
  if (/rate.?limit|429|too many requests/.test(m)) return 'rate-limit';
  if (/connection refused|econnrefused|network|fetch failed|could not resolve|curl/.test(m)) return 'network';
  if (/json|edit|out-of-scope|line|schema/.test(m)) return 'invalid-edit';
  if (/build|vite|syntax|module|compile/.test(m)) return 'verification-build';
  if (/permission|protected|forbidden|denied/.test(m)) return 'policy-or-permission';
  return 'implementation';
}

function dependenciesMet(obj) {
  return (obj.dependsOn || []).every(dep => completed.has(dep) || !objectives.some(candidate => candidate.id === dep));
}

function context(obj) {
  const chunks = [`OBJECTIVE: ${obj.title}\nPriority: ${obj.priority}\nDependencies: ${(obj.dependsOn || []).join(', ') || 'none'}\nAcceptance:\n- ${obj.acceptance.join('\n- ')}\nConstraints:\n- ${obj.constraints.join('\n- ')}`];
  for (const p of obj.files) chunks.push(`===== ${p} (1-based line numbers) =====\n${numbered(p)}`);
  chunks.push(`===== PROJECT MEMORY =====\n${read('builder/quality/project-memory.md', 1600)}`);
  chunks.push(`===== LESSONS =====\n${read('builder/quality/lessons.md', 1000)}`);
  return chunks.join('\n\n').slice(0, 15500);
}

function choose() {
  const available = objectives.filter(o => !completed.has(o.id) && dependenciesMet(o) && (attemptsThisRun.get(o.id) || 0) < maxAttemptsPerFeature);
  if (!available.length) return null;
  return available.sort((a, b) => {
    const af = state.failed?.[a.id]?.attempts || 0;
    const bf = state.failed?.[b.id]?.attempts || 0;
    return ((b.priority || 0) - bf * 8) - ((a.priority || 0) - af * 8);
  })[0];
}

const editSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    edits: {
      type: 'array',
      minItems: 1,
      maxItems: maxEdits,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          file: { type: 'string' },
          mode: { type: 'string', enum: ['replace', 'insert_after', 'delete'] },
          startLine: { type: 'integer', minimum: 1 },
          endLine: { type: 'integer', minimum: 1 },
          replacement: { type: 'string' }
        },
        required: ['file', 'mode', 'startLine', 'endLine', 'replacement']
      }
    }
  },
  required: ['edits']
};

function parseStructured(stdout) {
  let response = null;
  for (const line of stdout.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    let part;
    try { part = JSON.parse(line); } catch { continue; }
    if (part.error) throw new Error(String(part.error));
    if (part.message?.content) response = part.message.content;
    if (part.done && part.message?.content) response = part.message.content;
    if (part.done && part.eval_count !== undefined) response = part.message?.content || response;
  }
  if (!response) throw new Error('local model returned no structured edit response');
  let payload;
  try { payload = JSON.parse(response); } catch (e) { throw new Error(`structured edit JSON parse failed: ${e.message}`); }
  return payload;
}

function modelCall(obj, repair = false) {
  const previous = state.failed?.[obj.id]?.message || 'none';
  const previousClass = state.failed?.[obj.id]?.class || 'none';
  const repairInstruction = repair
    ? `Repair the previous failure. Return fewer, smaller edits. Previous failure: ${previous}`
    : 'Return the smallest coherent implementation that satisfies at least one acceptance criterion.';
  const prompt = `You are the primary implementation engineer for Bikeztagram AI. Implement ONE real production-quality increment of this exact objective. You may modify ONLY the listed files. Preserve exports and existing contracts. Do not add dependencies. Do not modify builder infrastructure, workflows, secrets, Vercel infrastructure, or protected paths. Do not invent media or APIs.\n\nUse the supplied 1-based line numbers. Return ONLY the JSON object matching the supplied schema. Each edit must use mode=replace with an inclusive startLine/endLine, mode=insert_after with startLine=endLine equal to the anchor line, or mode=delete with the inclusive range and empty replacement. Keep edits small and non-overlapping. Do not return a unified diff, markdown, commentary, or code fences. The runner will validate and apply the edits, then run git diff --check and npm run build.\n\n${repairInstruction}\n\n${context(obj)}\n\nPREVIOUS FAILURE CLASS: ${previousClass}`;
  const body = JSON.stringify({
    model,
    stream: false,
    keep_alive: '15m',
    format: editSchema,
    options: { temperature: 0, num_ctx: 8192, num_predict: 2200 },
    messages: [
      { role: 'system', content: 'You are a senior software engineer. Produce only the requested structured edit operations.' },
      { role: 'user', content: prompt }
    ]
  });
  const sec = Math.min(timeoutSeconds, Math.max(60, Math.floor(left() * 60)));
  return new Promise((resolve, reject) => {
    const child = spawn('curl', ['-sS', '--fail', '--connect-timeout', '20', '--max-time', String(sec), `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { cwd: root });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      err ? reject(err) : resolve(value);
    };
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', e => finish(e));
    child.on('close', (code, signal) => {
      if (code !== 0) return finish(new Error(stderr.trim() || `local model request failed (${code || signal || 'unknown'})`));
      try { finish(null, parseStructured(stdout)); } catch (e) { finish(e); }
    });
    const timer = setTimeout(() => { try { child.kill('SIGTERM'); } catch {} finish(new Error(`local model request timed out after ${sec}s`)); }, sec * 1000 + 2000);
  });
}

function validateEdits(payload, obj) {
  if (!payload || !Array.isArray(payload.edits) || payload.edits.length < 1 || payload.edits.length > maxEdits) throw new Error('structured response contains no valid edit list');
  const allowed = new Set(obj.files);
  const seen = new Map();
  let changedLines = 0;
  for (const edit of payload.edits) {
    if (!allowed.has(edit.file)) throw new Error(`edit targets out-of-scope file: ${edit.file}`);
    if (!['replace', 'insert_after', 'delete'].includes(edit.mode)) throw new Error(`unsupported edit mode: ${edit.mode}`);
    if (!Number.isInteger(edit.startLine) || !Number.isInteger(edit.endLine) || edit.startLine < 1 || edit.endLine < edit.startLine) throw new Error(`invalid line range for ${edit.file}`);
    const full = fs.readFileSync(file(edit.file), 'utf8');
    const lines = full.split(/\r?\n/);
    const maxLine = lines.length;
    if (edit.mode === 'insert_after') {
      if (edit.startLine !== edit.endLine || edit.endLine > maxLine) throw new Error(`invalid insert anchor for ${edit.file}`);
    } else if (edit.endLine > maxLine) {
      throw new Error(`edit range exceeds ${edit.file} (${edit.endLine}>${maxLine})`);
    }
    const rangeStart = edit.mode === 'insert_after' ? edit.startLine + 1 : edit.startLine;
    const rangeEnd = edit.mode === 'insert_after' ? edit.startLine + 1 : edit.endLine;
    const prior = seen.get(edit.file) || [];
    if (prior.some(([a, b]) => rangeStart <= b && rangeEnd >= a)) throw new Error(`overlapping edits for ${edit.file}`);
    prior.push([rangeStart, rangeEnd]);
    seen.set(edit.file, prior);
    const replacementLines = edit.replacement ? edit.replacement.split('\n').length : 0;
    changedLines += replacementLines + (edit.mode === 'insert_after' ? 0 : edit.endLine - edit.startLine + 1);
    if (replacementLines > 180 || changedLines > 360) throw new Error('structured edit is too large; use a smaller implementation increment');
  }
}

function applyEdits(payload) {
  const byFile = new Map();
  for (const edit of payload.edits) {
    if (!byFile.has(edit.file)) byFile.set(edit.file, []);
    byFile.get(edit.file).push(edit);
  }
  for (const [relative, edits] of byFile) {
    const target = file(relative);
    let lines = fs.readFileSync(target, 'utf8').split(/\r?\n/);
    edits.sort((a, b) => b.startLine - a.startLine);
    for (const edit of edits) {
      const replacement = edit.replacement ? edit.replacement.split('\n') : [];
      if (edit.mode === 'insert_after') lines.splice(edit.startLine, 0, ...replacement);
      else lines.splice(edit.startLine - 1, edit.endLine - edit.startLine + 1, ...replacement);
    }
    fs.writeFileSync(target, lines.join('\n'));
  }
}

function resetFailedEdits() {
  run('git', ['reset', '--hard', 'HEAD'], { stdio: 'inherit' });
  run('git', ['clean', '-fd', '-e', '.git'], { stdio: 'inherit' });
}

if (process.env.LOCAL_AI_READY !== '1') {
  console.error('[autobot] local AI unavailable; feature brain refuses paid fallback');
  process.exit(2);
}

appendAudit('feature-brain-run-started', { minutes, model, maxFeatures, maxAttemptsPerFeature, maxEdits, timeoutSeconds, protocol: 'structured-line-edits-v1', completed: [...completed] });

for (let n = 1; n <= maxFeatures && left() > 1; n++) {
  const obj = choose();
  if (!obj) {
    const blocked = objectives.filter(o => !completed.has(o.id) && !dependenciesMet(o)).map(o => ({ id: o.id, dependsOn: o.dependsOn || [] }));
    console.log(blocked.length ? `[autobot] no eligible feature objective; dependency-blocked=${JSON.stringify(blocked)}` : '[autobot] no further eligible feature objective is available in this run');
    break;
  }
  let verified = false;
  for (let attempt = 1; attempt <= maxAttemptsPerFeature && left() > 1; attempt++) {
    attemptsThisRun.set(obj.id, (attemptsThisRun.get(obj.id) || 0) + 1);
    console.log(`[autobot] FEATURE ${n}/${maxFeatures}: ${obj.id} — attempt ${attempt}/${maxAttemptsPerFeature} — ${left().toFixed(1)}m remaining — model=${model}`);
    try {
      const result = await modelCall(obj, attempt > 1);
      const payload = result;
      validateEdits(payload, obj);
      applyEdits(payload);
      run('git', ['diff', '--check'], { stdio: 'inherit' });
      run('npm', ['run', 'build'], { stdio: 'inherit', timeout: Math.min(900000, Math.max(60000, Math.floor(left() * 60000))) });
      completed.add(obj.id);
      delete state.failed?.[obj.id];
      save();
      appendAudit('feature-verified', { objectiveId: obj.id, attempt, edits: payload.edits.length, protocol: 'structured-line-edits-v1' });
      console.log(`[autobot] VERIFIED FEATURE: ${obj.id}`);
      verified = true;
      break;
    } catch (e) {
      const failureClass = classifyFailure(e.message);
      state.failed ||= {};
      state.failed[obj.id] = { ...(state.failed[obj.id] || {}), message: e.message, class: failureClass, at: new Date().toISOString(), attempts: (state.failed[obj.id]?.attempts || 0) + 1 };
      save();
      appendAudit('feature-failed', { objectiveId: obj.id, attempt, failureClass, message: e.message, protocol: 'structured-line-edits-v1' });
      try { resetFailedEdits(); } catch (resetError) { appendAudit('feature-reset-failed', { objectiveId: obj.id, message: resetError.message }); console.error(`[autobot] reset failed: ${resetError.message}`); process.exit(2); }
      console.error(`[autobot] feature ${obj.id} failed and was reset (${failureClass}): ${e.message}`);
      if (attempt < maxAttemptsPerFeature && left() > 3) continue;
      break;
    }
  }
  if (!verified && left() <= 1) break;
}

save();
appendAudit('feature-brain-run-finished', { verified: completed.size, attemptedThisRun: [...attemptsThisRun.values()].reduce((a, b) => a + b, 0), elapsedMinutes: Number(((Date.now() - started) / 60000).toFixed(2)), protocol: 'structured-line-edits-v1' });
console.log(`[autobot] feature brain finished; verified=${completed.size}; attemptedThisRun=${[...attemptsThisRun.values()].reduce((a, b) => a + b, 0)}; elapsed=${((Date.now() - started) / 60000).toFixed(2)}m`);
