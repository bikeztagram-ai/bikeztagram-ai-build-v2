#!/usr/bin/env node
/**
 * Bikeztagram's own local AI engineering brain.
 *
 * No OpenAI, Gemini, or other paid AI API is required. Ollama runs an
 * open-source coding model on the GitHub worker. The model proposes one
 * small, targeted unified diff at a time; this agent validates and applies
 * it, then the next pass reviews the real repository again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '60', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:1.5b-instruct';
const ollamaUrl = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const started = Date.now();
let pass = 0;
const maxPasses = Math.max(20, Number.parseInt(process.env.AUTOBOT_LOCAL_PASSES || '1000', 10));
const perPassSeconds = Math.max(45, Number.parseInt(process.env.LOCAL_AI_PASS_TIMEOUT_SECONDS || '120', 10));
let previousFailure = '';

const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
const status = () => run('git', ['status', '--porcelain']).trim();

const targetFiles = [
  'src/App.jsx',
  'src/director.js',
  'src/renderer.js',
  'src/musicProvider.js',
  'src/styles.css'
];

function readBounded(file, limit = 7000) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return '';
  const text = fs.readFileSync(full, 'utf8');
  return text.length <= limit ? text : `${text.slice(0, limit)}\n...[truncated]...`;
}

function context(target) {
  const memory = readBounded('builder/quality/project-memory.md', 4500);
  const lessons = readBounded('builder/quality/lessons.md', 3500);
  const packageJson = readBounded('package.json', 3500);
  const source = readBounded(target, 9000);
  return [
    `===== TARGET FILE: ${target} =====\n${source}`,
    `===== PROJECT MEMORY =====\n${memory}`,
    `===== LESSONS =====\n${lessons}`,
    `===== PACKAGE =====\n${packageJson}`
  ].join('\n\n').slice(0, 23000);
}

function chooseTarget() {
  // Rotate through real product code so the tiny local model never receives
  // the entire repository in one prompt.
  return targetFiles[pass % targetFiles.length];
}

function callModel(prompt) {
  const body = JSON.stringify({
    model,
    stream: false,
    keep_alive: '10m',
    options: {
      temperature: 0.1,
      num_ctx: 8192,
      num_predict: 1400
    },
    messages: [
      {
        role: 'system',
        content: 'You are Bikeztagram AI, a local autonomous software engineer. Return ONLY one small valid unified git diff. Never use markdown fences or commentary. Change only the named target file unless a second file is absolutely required. Prefer a focused production improvement over a large refactor.'
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
  const prompt = `Build Bikeztagram AI itself. Make ONE small, high-impact, user-visible improvement in the TARGET FILE below. Focus on cinematic editing quality, intelligent media selection, motion/transitions, pacing, audio, export/render reliability, media analysis, or Android UX. Do not change .github/workflows, builder infrastructure, secrets, API keys, or dependencies. Do not rewrite working code unnecessarily. The diff must be small enough to review and apply safely. Run/build-safe code only. If the previous attempt failed, repair that issue first. Return ONLY a unified git diff.\n\nTARGET FILE: ${target}\n\nPrevious validation issue: ${previousFailure || 'none'}\n\nTime remaining: ${left().toFixed(1)} minutes.\n\nRepository context:\n${context(target)}`;

  console.log(`[autobot] Local brain pass ${pass}/${maxPasses}; target=${target}; ${left().toFixed(1)} minutes remaining; model=${model}; timeout=${perPassSeconds}s`);
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
  if (!patch) {
    previousFailure = 'Local model returned no applicable unified diff.';
    console.log('[autobot] no patch returned; moving to the next targeted engineering pass.');
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
    console.log(`[autobot] Local brain pass ${pass} produced a verified product change in ${target}.`);
  } catch (error) {
    previousFailure = 'Validation/build failed after local model change; next pass must repair it.';
    console.error(`[autobot] validation failed: ${error.message}`);
  }

  if (status() === before) console.log('[autobot] working tree unchanged after validation; continuing.');
}

console.log(`[autobot] Local AI engineering layer finished after ${pass} passes and ${((Date.now() - started) / 60000).toFixed(2)} minutes.`);
