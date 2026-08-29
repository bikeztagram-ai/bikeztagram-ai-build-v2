#!/usr/bin/env node
/**
 * Session 2: validate the local brain's last change and let the same local
 * model repair a real build failure instead of silently carrying broken code.
 */
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b';
const ollamaUrl = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const timeoutSeconds = Math.max(60, Number.parseInt(process.env.LOCAL_AI_REPAIR_TIMEOUT_SECONDS || '120', 10));

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', ...options });
}
function build() {
  try {
    return { ok: true, output: execFileSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8', timeout: 15 * 60 * 1000, maxBuffer: 1024 * 1024 * 8 }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout || ''}\n${error.stderr || ''}\n${error.message}`.slice(-30000) };
  }
}
function modelRepair(prompt) {
  const body = JSON.stringify({
    model,
    stream: false,
    options: { temperature: 0.05, num_ctx: 8192, num_predict: 1800 },
    messages: [
      { role: 'system', content: 'You are Bikeztagram AI performing a repair pass. Return ONLY one valid unified git diff. Repair the existing production code using the supplied build failure. Do not rewrite unrelated code, add dependencies, touch workflows/secrets, or invent APIs. Preserve working behavior.' },
      { role: 'user', content: prompt }
    ]
  });
  const result = spawnSync('curl', ['-sS', '--fail', '--max-time', String(timeoutSeconds), `${ollamaUrl}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'local repair request failed');
  return JSON.parse(result.stdout)?.message?.content || '';
}
function cleanPatch(text) {
  const fenced = text.match(/```(?:diff|patch)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('diff --git ');
  return start >= 0 ? candidate.slice(start).trim() : '';
}

const before = git(['status', '--porcelain']).trim();
if (!before) {
  console.log('[autobot] self-repair: no pending local change; nothing to repair.');
  process.exit(0);
}

const first = build();
if (first.ok) {
  console.log('[autobot] self-repair: current working tree builds successfully.');
  process.exit(0);
}

const diff = git(['diff', '--', ':!builder/working'], { maxBuffer: 1024 * 1024 * 8 }).slice(-30000);
const prompt = `The current Bikeztagram working tree contains a local AI change that does not build. Diagnose the concrete failure and return a minimal repair diff.\n\nBUILD FAILURE:\n${first.output}\n\nCURRENT DIFF:\n${diff}\n\nRepair only the existing failure. The repair must be small and production-safe.`;

let response;
try {
  response = modelRepair(prompt);
} catch (error) {
  console.error(`[autobot] self-repair model failed: ${error.message}`);
  process.exit(1);
}

const patch = cleanPatch(response);
if (!patch) {
  console.error('[autobot] self-repair rejected: model returned no usable patch.');
  process.exit(1);
}

const patchFile = '.autobot-repair.patch';
fs.writeFileSync(patchFile, patch, 'utf8');
try {
  execFileSync('git', ['apply', '--whitespace=fix', patchFile], { cwd: root, stdio: 'inherit' });
} catch (error) {
  console.error(`[autobot] self-repair patch rejected: ${error.message}`);
  process.exit(1);
} finally {
  fs.rmSync(patchFile, { force: true });
}

const second = build();
if (!second.ok) {
  console.error('[autobot] self-repair attempted but the repaired tree still fails to build.');
  console.error(second.output);
  process.exit(1);
}

console.log('[autobot] self-repair succeeded: repaired local AI change and build passed.');
