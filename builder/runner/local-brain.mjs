#!/usr/bin/env node
/**
 * Bikeztagram's own local AI engineering brain.
 *
 * No OpenAI, Gemini, or other paid AI API is required. The workflow installs
 * Ollama locally and runs an open-source Qwen2.5-Coder model on the worker.
 * The model proposes a unified diff; this agent validates and applies it,
 * then the next pass reviews the real repository again.
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
const maxPasses = Math.max(1000, Number.parseInt(process.env.AUTOBOT_LOCAL_PASSES || '1000', 10));
let previousFailure = '';

const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
const status = () => run('git', ['status', '--porcelain']).trim();

function context() {
  const candidates = [
    'package.json', 'src/App.jsx', 'src/director.js', 'src/renderer.js',
    'src/musicProvider.js', 'src/styles.css', 'README.md',
    'builder/project-memory.json', 'builder/roadmap.json'
  ];
  const chunks = [];
  for (const file of candidates) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    chunks.push(`\\n===== ${file} =====\\n${text.slice(0, 12000)}`);
  }
  return chunks.join('\\n').slice(0, 56000);
}

function callModel(prompt) {
  const body = JSON.stringify({
    model,
    stream: false,
    options: { temperature: 0.15, num_ctx: 32768 },
    messages: [
      { role: 'system', content: 'You are Bikeztagram AI, a persistent autonomous software engineer. Return only a valid unified git diff. Never include markdown fences or commentary. Make practical, production-quality changes.' },
      { role: 'user', content: prompt }
    ]
  });
  const out = spawnSync('curl', ['-sS', '--fail', '--max-time', String(Math.max(60, Math.floor(left() * 60))), `${ollamaUrl}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { cwd: root, encoding: 'utf8' });
  if (out.status !== 0) throw new Error(out.stderr || `local model request failed (${out.status})`);
  const json = JSON.parse(out.stdout);
  return json?.message?.content || '';
}

function cleanPatch(text) {
  const fenced = text.match(/```(?:diff|patch)?\\s*([\\s\\S]*?)```/i);
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
  const before = status();
  const prompt = `Build Bikeztagram AI itself. Inspect the repository and make the highest-impact unfinished product improvement you can complete safely. Focus on real user-visible cinematic editing quality, intelligent media selection, motion/transitions, pacing, audio, export/render reliability, media analysis, or Android UX. Do not change .github/workflows. Do not add API keys or paid AI dependencies. Do not rewrite working features unnecessarily. Run/build-safe code only. Return ONLY a unified git diff that applies cleanly. If the previous attempt failed, fix that issue first.\\n\\nPrevious validation issue: ${previousFailure || 'none'}\\n\\nTime remaining: ${left().toFixed(1)} minutes.\\n\\nRepository context:${context()}`;

  console.log(`[autobot] Local brain pass ${pass}/${maxPasses}; ${left().toFixed(1)} minutes remaining; model=${model}`);
  let response;
  try { response = callModel(prompt); }
  catch (error) { previousFailure = error.message; console.error(`[autobot] local brain request failed: ${previousFailure}`); break; }

  const patch = cleanPatch(response);
  if (!patch) { previousFailure = 'Local model returned no applicable unified diff.'; console.log('[autobot] no patch returned; starting another local engineering pass.'); continue; }

  try { applyPatch(patch); }
  catch (error) { previousFailure = `git apply failed: ${error.message}`; console.error(`[autobot] rejected model patch: ${previousFailure}`); continue; }

  try {
    execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
    execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', timeout: Math.max(60000, Math.min(left() * 60000, 15 * 60000)) });
    previousFailure = '';
    console.log(`[autobot] Local brain pass ${pass} produced a verified product change.`);
  } catch (error) {
    previousFailure = 'Validation/build failed after local model change; next pass must repair it.';
    console.error(`[autobot] validation failed: ${error.message}`);
  }

  if (status() === before) console.log('[autobot] working tree unchanged after validation; continuing.');
}

console.log(`[autobot] Local AI engineering layer finished after ${pass} passes and ${((Date.now() - started) / 60000).toFixed(2)} minutes.`);
