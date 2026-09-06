#!/usr/bin/env node
/**
 * Feature-level local engineer.
 * Implements real product objectives, verifies them, and records failures.
 * Optimised for CPU-only hosted runners: compact context, bounded generation,
 * streamed Ollama responses, metrics, and a real second attempt after failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { appendAudit } from '../quality/audit-log.mjs';

const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '60', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const timeoutSeconds = Math.max(120, Number.parseInt(process.env.LOCAL_AI_FEATURE_TIMEOUT_SECONDS || '300', 10));
const maxFeatures = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES || '2', 10));
const maxAttemptsPerFeature = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || '2', 10));
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const file = p => path.join(root, p);
const read = (p, max = 5000) => {
  const f = file(p);
  if (!fs.existsSync(f)) return '';
  const s = fs.readFileSync(f, 'utf8');
  return s.length <= max ? s : `${s.slice(0, max)}\n...[truncated]...`;
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
  fs.writeFileSync(statePath, JSON.stringify({
    version: 3,
    completed: [...completed],
    failed: state.failed || {},
    updatedAt: new Date().toISOString(),
  }, null, 2) + '\n');
}

function classifyFailure(message = '') {
  const m = String(message).toLowerCase();
  if (/timed out|timeout|etimedout/.test(m)) return 'timeout';
  if (/rate.?limit|429|too many requests/.test(m)) return 'rate-limit';
  if (/connection refused|econnrefused|network|fetch failed|could not resolve|curl/.test(m)) return 'network';
  if (/invalid|empty|out-of-scope|patch|diff/.test(m)) return 'invalid-patch';
  if (/build|vite|syntax|module|compile/.test(m)) return 'verification-build';
  if (/permission|protected|forbidden|denied/.test(m)) return 'policy-or-permission';
  return 'implementation';
}

function dependenciesMet(obj) {
  return (obj.dependsOn || []).every(dep => completed.has(dep) || !objectives.some(candidate => candidate.id === dep));
}

function context(obj, compact = true) {
  const fileLimit = compact ? 1800 : 2800;
  const memoryLimit = compact ? 900 : 1400;
  const lessonLimit = compact ? 700 : 1000;
  const cap = compact ? 8500 : 12500;
  const chunks = [`OBJECTIVE: ${obj.title}\nPriority: ${obj.priority}\nDependencies: ${(obj.dependsOn || []).join(', ') || 'none'}\nAcceptance:\n- ${obj.acceptance.join('\n- ')}\nConstraints:\n- ${obj.constraints.join('\n- ')}`];
  for (const p of obj.files) chunks.push(`===== ${p} =====\n${read(p, fileLimit)}`);
  chunks.push(`===== PROJECT MEMORY =====\n${read('builder/quality/project-memory.md', memoryLimit)}`);
  chunks.push(`===== LESSONS =====\n${read('builder/quality/lessons.md', lessonLimit)}`);
  return chunks.join('\n\n').slice(0, cap);
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

function parseStream(stdout) {
  let content = '';
  let metrics = null;
  for (const line of stdout.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    let part;
    try { part = JSON.parse(line); } catch { continue; }
    if (part.error) throw new Error(String(part.error));
    if (part.message?.content) content += part.message.content;
    if (part.done) metrics = {
      totalDuration: part.total_duration,
      loadDuration: part.load_duration,
      promptTokens: part.prompt_eval_count,
      promptDuration: part.prompt_eval_duration,
      outputTokens: part.eval_count,
      outputDuration: part.eval_duration,
      doneReason: part.done_reason,
    };
  }
  if (!content.trim()) throw new Error('local model returned no assistant content');
  return { content, metrics };
}

function modelCall(obj, compact = true, repair = false) {
  const previous = state.failed?.[obj.id]?.message || 'none';
  const previousClass = state.failed?.[obj.id]?.class || 'none';
  const repairInstruction = repair
    ? 'This is a repair attempt. The previous model output was rejected. Return a smaller, syntactically valid unified diff that changes only the allowed files and contains complete hunks.'
    : 'Return the smallest complete patch that can satisfy at least one meaningful acceptance criterion without changing unrelated behaviour.';
  const prompt = `You are the primary implementation engineer for Bikeztagram AI. Implement ONE coherent, production-quality increment of this exact objective. This is real product work, not planning. You may modify ONLY the files listed for the objective. Preserve exports and existing contracts. Do not add dependencies. Do not modify builder infrastructure, workflows, secrets, Vercel infrastructure, or protected paths. Do not invent media or APIs. Do not return commentary. Return ONLY a valid unified git diff beginning with diff --git. ${repairInstruction} Use the acceptance criteria as the definition of done.\n\n${context(obj, compact)}\n\nPREVIOUS FAILURE CLASS: ${previousClass}\nPREVIOUS ATTEMPT RESULT: ${previous}`;
  const body = JSON.stringify({
    model,
    stream: true,
    keep_alive: '15m',
    options: {
      temperature: 0.05,
      num_ctx: compact ? 4096 : 5120,
      num_predict: compact ? 1400 : 2000,
    },
    messages: [
      { role: 'system', content: 'You are a senior software engineer. Write real maintainable production code and respect the supplied objective.' },
      { role: 'user', content: prompt },
    ],
  });
  const sec = Math.min(timeoutSeconds, Math.max(60, Math.floor(left() * 60)));
  return new Promise((resolve, reject) => {
    const child = spawn('curl', [
      '-sS', '--fail', '--no-buffer', '--connect-timeout', '20', '--max-time', String(sec),
      `${host}/api/chat`, '-H', 'Content-Type: application/json', '-d', body,
    ], { cwd: root });
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
      try { finish(null, parseStream(stdout)); }
      catch (e) { finish(e); }
    });
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch {}
      finish(new Error(`local model request timed out after ${sec}s`));
    }, sec * 1000 + 2000);
  });
}

function clean(s) {
  const m = String(s || '').match(/```(?:diff|patch)?\s*([\s\S]*?)```/i);
  const x = m ? m[1] : String(s || '');
  const i = x.indexOf('diff --git ');
  return i >= 0 ? x.slice(i).trim() : '';
}

function validPatch(p, obj) {
  if (!p || !p.includes('diff --git ')) return false;
  const allowed = new Set(obj.files);
  const paths = [...p.matchAll(/^diff --git a\/(.*?) b\/(.*?)$/gm)].map(m => m[2]);
  if (!paths.length || paths.some(x => !allowed.has(x))) return false;
  const add = p.split('\n').filter(x => x.startsWith('+') && !x.startsWith('+++'));
  const del = p.split('\n').filter(x => x.startsWith('-') && !x.startsWith('---'));
  const codeAdded = add.filter(x => !/^\+\s*(?:\/\/|\/\*|\*|#|$)/.test(x));
  return codeAdded.length >= 3 && add.length <= 300 && del.length <= 300;
}

function apply(p) {
  const f = file('.autobot-feature.patch');
  fs.writeFileSync(f, p);
  try { run('git', ['apply', '--index', '--whitespace=fix', f], { stdio: 'inherit' }); }
  finally { fs.rmSync(f, { force: true }); }
}

function resetFailedPatch() {
  run('git', ['reset', '--hard', 'HEAD'], { stdio: 'inherit' });
  run('git', ['clean', '-fd', '-e', '.git'], { stdio: 'inherit' });
}

if (process.env.LOCAL_AI_READY !== '1') {
  console.error('[autobot] local AI unavailable; feature brain refuses paid fallback');
  process.exit(2);
}

appendAudit('feature-brain-run-started', { minutes, model, maxFeatures, maxAttemptsPerFeature, timeoutSeconds, completed: [...completed] });

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
    const compact = true;
    const repair = attempt > 1;
    console.log(`[autobot] FEATURE ${n}/${maxFeatures}: ${obj.id} — attempt ${attempt}/${maxAttemptsPerFeature} — ${left().toFixed(1)}m remaining — model=${model}`);
    try {
      const result = await modelCall(obj, compact, repair);
      const patch = clean(result.content);
      if (result.metrics) {
        const seconds = Number(result.metrics.totalDuration || 0) / 1e9;
        const tokens = Number(result.metrics.outputTokens || 0);
        const tps = seconds > 0 ? Number((tokens / seconds).toFixed(2)) : null;
        appendAudit('feature-model-metrics', { objectiveId: obj.id, attempt, seconds: Number(seconds.toFixed(2)), promptTokens: result.metrics.promptTokens || 0, outputTokens: tokens, tokensPerSecond: tps, loadSeconds: Number((Number(result.metrics.loadDuration || 0) / 1e9).toFixed(2)) });
        console.log(`[autobot] model metrics: ${seconds.toFixed(1)}s, ${tokens} output tokens${tps ? `, ${tps} tok/s` : ''}`);
      }
      if (!validPatch(patch, obj)) throw new Error('model returned an invalid, empty, or out-of-scope feature patch');
      apply(patch);
      run('git', ['diff', '--check'], { stdio: 'inherit' });
      run('npm', ['run', 'build'], { stdio: 'inherit', timeout: Math.min(900000, Math.max(60000, Math.floor(left() * 60000))) });
      completed.add(obj.id);
      delete state.failed?.[obj.id];
      save();
      appendAudit('feature-verified', { objectiveId: obj.id, attempt });
      console.log(`[autobot] VERIFIED FEATURE: ${obj.id}`);
      verified = true;
      break;
    } catch (e) {
      const failureClass = classifyFailure(e.message);
      state.failed ||= {};
      state.failed[obj.id] = {
        ...(state.failed[obj.id] || {}),
        message: e.message,
        class: failureClass,
        at: new Date().toISOString(),
        attempts: (state.failed[obj.id]?.attempts || 0) + 1,
      };
      save();
      appendAudit('feature-failed', { objectiveId: obj.id, attempt, failureClass, message: e.message });
      try { resetFailedPatch(); }
      catch (resetError) {
        appendAudit('feature-reset-failed', { objectiveId: obj.id, message: resetError.message });
        console.error(`[autobot] reset failed: ${resetError.message}`);
        process.exit(2);
      }
      console.error(`[autobot] feature ${obj.id} failed and was reset (${failureClass}): ${e.message}`);
      if (attempt < maxAttemptsPerFeature && left() > 3) continue;
      break;
    }
  }

  if (!verified && left() <= 1) break;
}

save();
appendAudit('feature-brain-run-finished', {
  verified: completed.size,
  attemptedThisRun: [...attemptsThisRun.values()].reduce((a, b) => a + b, 0),
  elapsedMinutes: Number(((Date.now() - started) / 60000).toFixed(2)),
});
console.log(`[autobot] feature brain finished; verified=${completed.size}; attemptedThisRun=${[...attemptsThisRun.values()].reduce((a, b) => a + b, 0)}; elapsed=${((Date.now() - started) / 60000).toFixed(2)}m`);
