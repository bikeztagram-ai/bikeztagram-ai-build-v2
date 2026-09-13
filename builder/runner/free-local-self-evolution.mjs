#!/usr/bin/env node
/**
 * Free local AutoBot self-evolution engine.
 * Uses a locally downloaded open coding model through llama.cpp. No hosted model API,
 * no API key, no paid provider, no commit/push/PR operations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const root = process.cwd();
const target = process.env.AUTOBOT_LOCAL_TARGET || 'builder/runner/aider-feature-brain.mjs';
const allowed = new Set([
  'builder/runner/aider-feature-brain.mjs',
  'builder/runner/ollama-performance-proxy.mjs',
  'builder/runner/self-improvement-planner.mjs',
]);
const runtimePrefixes = ['builder/working/'];
const protectedPrefixes = [
  'builder/brain/feature-objectives.json',
  'builder/runner/autobot-evolution-policy.json',
  'scripts/autobot/verify-',
  'scripts/autobot/run-production-gate.mjs',
  'builder/quality/',
  '.github/workflows/',
  'package.json',
];

const run = (cmd, args, options = {}) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', ...options });
const exec = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });

function learningSnapshot() {
  const files = ['builder/working/aider-feature-brain-learning.json', 'builder/working/aider-feature-brain-state.json'];
  return files.map(file => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) return `${file}: unavailable`;
    try { return `${file}: ${JSON.stringify(JSON.parse(fs.readFileSync(full, 'utf8'))).slice(-6000)}`; }
    catch { return `${file}: unreadable`; }
  }).join('\n');
}

function trackedPaths() {
  return exec('git', ['status', '--porcelain=v1', '--untracked-files=all'])
    .split(/\r?\n/).filter(Boolean).map(line => line.slice(3).trim()).filter(Boolean)
    .filter(file => !runtimePrefixes.some(prefix => file === prefix || file.startsWith(prefix)));
}

function isProtected(file) { return protectedPrefixes.some(prefix => file === prefix || file.startsWith(prefix)); }

function rollback(before) {
  const beforeSet = new Set(before);
  for (const file of trackedPaths()) {
    if (!beforeSet.has(file)) {
      try { execFileSync('git', ['restore', '--', file], { cwd: root, stdio: 'ignore' }); } catch {}
      try { execFileSync('git', ['clean', '-fd', '--', file], { cwd: root, stdio: 'ignore' }); } catch {}
    }
  }
}

function extractDiff(output) {
  const fenced = output.match(/```(?:diff|patch)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : output.trim();
  const start = candidate.indexOf('diff --git ');
  if (start >= 0) return candidate.slice(start).trim();
  const unified = candidate.indexOf('--- ');
  if (unified >= 0) return candidate.slice(unified).trim();
  return '';
}

function assertScope(before) {
  const beforeSet = new Set(before);
  const changed = trackedPaths().filter(file => !beforeSet.has(file));
  const violations = changed.filter(file => !allowed.has(file) || isProtected(file));
  if (violations.length) throw new Error(`scope/protection violation: ${violations.join(', ')}`);
  if (!changed.length) throw new Error('no-progress: model produced no allowed file change');
}

function verify() {
  execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
  execFileSync('npm', ['run', 'verify:autobot-self-improvement-boundary'], { cwd: root, stdio: 'inherit' });
  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
}

function main() {
  if (!allowed.has(target) || isProtected(target)) throw new Error(`unsafe target: ${target}`);
  const targetPath = path.join(root, target);
  if (!fs.existsSync(targetPath)) throw new Error(`target missing: ${target}`);
  const llama = process.env.LLAMA_CLI;
  const model = process.env.LOCAL_QWEN_MODEL;
  if (!llama || !model) throw new Error('LLAMA_CLI and LOCAL_QWEN_MODEL are required');
  const before = trackedPaths();
  if (before.length) throw new Error(`dirty worktree before attempt: ${before.join(', ')}`);

  const source = fs.readFileSync(targetPath, 'utf8');
  const prompt = `
<|im_start|>system
You are a tightly controlled code-evolution worker for Bikeztagram AI.
Product work is LOCKED. Your only job is to improve the autonomous engineering mechanism.
You must output ONLY a unified git diff. Do not output explanations, markdown, or full files.
<|im_end|>
<|im_start|>user
/no_think
SELF-EVOLUTION TASK

Target file: ${target}

Observed learning evidence:
${learningSnapshot()}

The previous coding attempts repeatedly timed out with zero verified edits.
Make ONE small, concrete engineering improvement that directly addresses that evidence.
Prefer a bounded execution/context/decision improvement over a rewrite.

Rules:
- Modify only ${target}.
- Do not touch product code.
- Do not touch workflows, package manifests, safety verifiers, objective definitions,
  protected paths, provider policy, rollback logic, or no-auto-commit controls.
- Keep the patch small and reviewable.
- Preserve existing public contracts.
- The patch must be syntactically valid JavaScript.
- The patch must be useful even if the next model attempt is weak.
- Do not invent benchmark results.

Return exactly one unified diff beginning with "diff --git".
<|im_end|>
<|im_start|>assistant
`;

  const context = Number(process.env.LOCAL_QWEN_CONTEXT || 6144);
  const output = Number(process.env.LOCAL_QWEN_OUTPUT || 700);
  const threads = Number(process.env.LOCAL_QWEN_THREADS || 4);
  const result = run(llama, [
    '-m', model,
    '-c', String(context),
    '-n', String(output),
    '-t', String(threads),
    '--temp', '0.1', '--top-p', '0.9', '--seed', '42',
    '--simple-io', '--no-display-prompt',
    '-p', `${prompt}\n\nCURRENT FILE:\n${source}`,
  ], { timeout: Number(process.env.LOCAL_QWEN_TIMEOUT_MS || 480000), maxBuffer: 8 * 1024 * 1024 });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`llama-cli exited with ${result.status}: ${(result.stderr || '').slice(-1000)}`);
  const diff = extractDiff(result.stdout || '');
  if (!diff) throw new Error('model returned no unified diff');

  const patchFile = path.join(root, 'builder/working/free-local-self-evolution.patch');
  fs.mkdirSync(path.dirname(patchFile), { recursive: true });
  fs.writeFileSync(patchFile, `${diff}\n`);
  const check = run('git', ['apply', '--check', patchFile]);
  if (check.status !== 0) throw new Error(`git apply --check failed: ${(check.stdout || '') + (check.stderr || '')}`);
  exec('git', ['apply', '--whitespace=error', patchFile]);

  try { assertScope(before); verify(); }
  catch (error) { rollback(before); throw error; }

  const finalDiff = exec('git', ['diff', '--', ...[...allowed]]);
  const evidence = {
    engine: 'free-local-qwen-llama.cpp', model, target,
    context, outputTokens: output, threads,
    changedPaths: trackedPaths().filter(file => !before.includes(file)),
    diffBytes: Buffer.byteLength(finalDiff), verified: true,
    provider: 'local-only', hostedApiRequired: false, at: new Date().toISOString(),
  };
  fs.mkdirSync(path.join(root, 'builder/working'), { recursive: true });
  fs.writeFileSync(path.join(root, 'builder/working/free-local-self-evolution-result.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}

try { main(); }
catch (error) { console.error(`[autobot-free] ${error.message}`); process.exit(1); }
