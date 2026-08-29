#!/usr/bin/env node
/**
 * Bikeztagram's own local AI engineering brain.
 *
 * No OpenAI, Gemini, or other paid AI API is required. Ollama runs an
 * open-source coding model on the GitHub worker. The model proposes one
 * small, targeted unified diff at a time; this agent validates and applies
 * it, then the next pass reviews the real repository again.
 *
 * Important: this is a product engineer, not a random code generator.
 * Every pass receives a concrete quality brief for its target file and must
 * improve a real user-visible capability while preserving working paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '60', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b';
const ollamaUrl = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const started = Date.now();
let pass = 0;
const maxPasses = Math.max(20, Number.parseInt(process.env.AUTOBOT_LOCAL_PASSES || '1000', 10));
const perPassSeconds = Math.max(45, Number.parseInt(process.env.LOCAL_AI_PASS_TIMEOUT_SECONDS || '120', 10));
let previousFailure = '';

const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
const status = () => run('git', ['status', '--porcelain']).trim();

const targetBriefs = [
  {
    file: 'src/App.jsx',
    brief: 'Make the editor lifecycle more production-grade: truthful loading/error/recovery states, resilient analysis/render flows, clear user feedback, and Android-friendly interaction. Do not weaken working upload, render, persistence, or export paths.'
  },
  {
    file: 'src/director.js',
    brief: 'Improve deterministic director intelligence: quality-aware shot ranking, explicit hook/build/reveal/action/hero/outro story roles, subject diversity, prompt-aware selection, and auditable decisions. Never invent media.'
  },
  {
    file: 'src/aiEditPlanner.js',
    brief: 'Improve the actual edit plan: stronger pacing and continuity, purposeful shot duration, motion and transition variety, prompt-aware story structure, and protection against repetitive or weak cuts. Preserve existing successful planner inputs and outputs.'
  },
  {
    file: 'src/renderer.js',
    brief: 'Improve real rendered-film quality and reliability: apply shot-specific motion/transition/timing data consistently, preserve source framing, avoid black frames and timing drift, and keep browser rendering/export stable. Do not rewrite the renderer wholesale.'
  },
  {
    file: 'src/socialExport.js',
    brief: 'Improve social delivery quality: canonical 9:16, 1:1 and 16:9 profiles, deterministic metadata/filenames, safe validation, and truthful duration/output checks without breaking download/share.'
  },
  {
    file: 'src/projectPersistence.js',
    brief: 'Improve real project recovery: schema-safe snapshots, migration, last-known-good recovery, truthful missing-media handling, and serialisable state. Never persist File/Blob/object URLs as if they were durable media.'
  },
  {
    file: 'src/styles.css',
    brief: 'Improve the actual Android/PWA editing experience: safe areas, touch targets, readable status/error states, responsive timeline/control layout, and reduced-motion support without changing the cinematic visual identity.'
  }
];

function readBounded(file, limit = 7000) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return '';
  const text = fs.readFileSync(full, 'utf8');
  return text.length <= limit ? text : `${text.slice(0, limit)}\n...[truncated]...`;
}

function context(target) {
  const memory = readBounded('builder/quality/project-memory.md', 3500);
  const lessons = readBounded('builder/quality/lessons.md', 3000);
  const packageJson = readBounded('package.json', 3000);
  const source = readBounded(target, 10000);
  return [
    `===== TARGET FILE: ${target} =====\n${source}`,
    `===== PROJECT MEMORY =====\n${memory}`,
    `===== LESSONS =====\n${lessons}`,
    `===== PACKAGE =====\n${packageJson}`
  ].join('\n\n').slice(0, 21000);
}

function chooseTarget() {
  return targetBriefs[pass % targetBriefs.length];
}

function callModel(prompt) {
  const body = JSON.stringify({
    model,
    stream: false,
    keep_alive: '10m',
    options: {
      temperature: 0.05,
      num_ctx: 8192,
      num_predict: 1800
    },
    messages: [
      {
        role: 'system',
        content: 'You are Bikeztagram AI, a senior local autonomous product engineer. You are improving a real production React/Vite motorcycle cinematic editor. Return ONLY one small valid unified git diff. Never use markdown fences or commentary. Change only the named target file unless a second file is absolutely required for the same behavior. Do not make cosmetic, formatting-only, speculative, placeholder, TODO, or documentation-only changes. Prefer a measurable user-visible capability. Preserve existing working behavior and public function contracts.'
      },
      { role: 'user', content: prompt }
    ]
  });
  const timeout = Math.min(perPassSeconds, Math.max(45, Math.floor(left() * 60)));
  const out = spawnSync('curl', [
    '-sS', '--fail', '--max-time', String(timeout),
    `${ollamaUrl}/api/chat`,
    '-H', 'Content-Type: application/json',
    '-d', body
  ], { cwd: root, encoding: 'utf8' });
  if (out.status !== 0) throw new Error(out.stderr || `local model request failed (${out.status})`);
  const json = JSON.parse(out.stdout);
  return json?.message?.content || '';
}

function cleanPatch(text) {
  const fenced = text.match(/```(?:diff|patch)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('diff --git ');
  return start >= 0 ? candidate.slice(start).trim() : '';
}

function patchLooksMeaningful(patch, target) {
  if (!patch || !patch.includes(` b/${target}`)) return false;
  const added = patch.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));
  const removed = patch.split('\n').filter(line => line.startsWith('-') && !line.startsWith('---'));
  const nonCommentAdded = added.filter(line => !/^\+\s*(?:\/\/|\/\*|\*|#|$)/.test(line));
  if (nonCommentAdded.length < 2) return false;
  if (added.length > 180 || removed.length > 180) return false;
  return true;
}

function applyPatch(patch) {
  const file = path.join(root, '.autobot-local.patch');
  fs.writeFileSync(file, patch, 'utf8');
  try {
    execFileSync('git', ['apply', '--index', '--whitespace=fix', file], { cwd: root, stdio: 'inherit' });
  } finally {
    fs.rmSync(file, { force: true });
  }
}

if (process.env.LOCAL_AI_READY !== '1') {
  console.error('[autobot] Local AI is not installed/ready; refusing to fall back to a paid API.');
  process.exit(2);
}

while (pass < maxPasses && left() > 1) {
  pass += 1;
  const target = chooseTarget();
  const before = status();
  const prompt = `Build Bikeztagram AI itself. Make ONE small, high-impact production improvement in the TARGET FILE.\n\nQUALITY BRIEF:\n${target.brief}\n\nRules:\n- Implement real working code, not a comment describing future work.\n- Do not invent APIs, dependencies, media, or test results.\n- Do not change .github/workflows, builder infrastructure, secrets, API keys, or dependencies.\n- Do not rewrite working code unnecessarily.\n- Preserve existing exports and call contracts unless the change is strictly backward compatible.\n- Prefer a small deterministic improvement that can be verified with the existing build/tests.\n- If the previous attempt failed, repair that issue first.\n- Return ONLY a unified git diff for ${target.file}.\n\nTARGET FILE: ${target.file}\n\nPrevious validation issue: ${previousFailure || 'none'}\n\nTime remaining: ${left().toFixed(1)} minutes.\n\nRepository context:\n${context(target.file)}`;

  console.log(`[autobot] Local brain pass ${pass}/${maxPasses}; target=${target.file}; ${left().toFixed(1)} minutes remaining; model=${model}; timeout=${perPassSeconds}s`);
  let response;
  try {
    response = callModel(prompt);
  } catch (error) {
    previousFailure = error.message;
    console.error(`[autobot] local brain request failed: ${previousFailure}`);
    console.log('[autobot] Skipping this pass instead of stalling the whole run.');
    continue;
  }

  const patch = cleanPatch(response);
  if (!patchLooksMeaningful(patch, target.file)) {
    previousFailure = 'Local model returned no small meaningful product diff for the requested target.';
    console.log('[autobot] rejected weak/empty model output; moving to the next targeted engineering pass.');
    continue;
  }

  try {
    applyPatch(patch);
  } catch (error) {
    previousFailure = `git apply failed: ${error.message}`;
    console.error(`[autobot] rejected model patch: ${previousFailure}`);
    continue;
  }

  try {
    execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
    const remainingSeconds = Math.max(60, Math.floor(left() * 60));
    execFileSync('npm', ['run', 'build'], {
      cwd: root,
      stdio: 'inherit',
      timeout: Math.min(15 * 60 * 1000, remainingSeconds * 1000)
    });
    previousFailure = '';
    console.log(`[autobot] Local brain pass ${pass} produced a verified product change in ${target.file}.`);
  } catch (error) {
    previousFailure = 'Validation/build failed after local model change; next pass must repair it.';
    console.error(`[autobot] validation failed: ${error.message}`);
  }

  if (status() === before) console.log('[autobot] working tree unchanged after validation; continuing.');
}

console.log(`[autobot] Local AI engineering layer finished after ${pass} passes and ${((Date.now() - started) / 60000).toFixed(2)} minutes.`);
