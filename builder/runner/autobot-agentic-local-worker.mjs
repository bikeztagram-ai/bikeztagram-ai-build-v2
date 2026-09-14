#!/usr/bin/env node
/**
 * Targeted local AutoBot repair worker.
 *
 * The local model is deliberately used for the smallest reliable job: produce
 * a complete replacement for ONE allowed AutoBot engineering file. The
 * controller, not the model, generates the git diff. This removes unified-diff
 * formatting from the model's responsibilities while preserving strict
 * validation, scope, syntax and rollback gates.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const target = process.env.AUTOBOT_LOCAL_TARGET || 'builder/runner/ollama-performance-proxy.mjs';
const allowed = new Set((process.env.AUTOBOT_ALLOWED_PATHS || target).split(',').map(s => s.trim()).filter(Boolean));
const model = process.env.AUTOBOT_AGENT_MODEL || 'local-qwen-coder-3b';
const apiBase = process.env.AUTOBOT_AGENT_API_BASE || 'http://127.0.0.1:8080/v1';
const maxOutputTokens = Number(process.env.AUTOBOT_AGENT_MAX_OUTPUT_TOKENS || 1400);
const requestTimeoutMs = Number(process.env.AUTOBOT_AGENT_REQUEST_TIMEOUT_MS || 180000);
const learningFiles = [
  'builder/working/aider-feature-brain-learning.json',
  'builder/working/aider-feature-brain-state.json'
];

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, { cwd: root, encoding: 'utf8', ...options });
}

function git(...args) {
  return run('git', args);
}

function trackedChanges(cwd = root) {
  const result = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git status failed: ${result.stderr || result.stdout}`);
  return result.stdout.split(/\r?\n/).filter(Boolean).map(line => line.slice(3).trim()).filter(Boolean);
}

function trackedCodeChanges() {
  const result = git('diff', '--name-only');
  if (result.status !== 0) throw new Error(`git diff failed: ${result.stderr || result.stdout}`);
  return result.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function readLearningEvidence() {
  const maxCharsPerFile = 1400;
  return learningFiles.map(file => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) return `${file}: unavailable`;
    try {
      const text = fs.readFileSync(full, 'utf8');
      const compact = text.slice(-maxCharsPerFile).replace(/\s+/g, ' ').trim();
      return `${file}: ${compact}`;
    } catch {
      return `${file}: unreadable`;
    }
  }).join('\n');
}

function readTarget() {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) throw new Error(`target does not exist: ${target}`);
  return fs.readFileSync(full, 'utf8').slice(0, 12000);
}

function taskPrompt(extra = '') {
  const targetText = readTarget();
  return `You are the LOCAL REPAIR MODEL for the Bikeztagram AI autonomous engineering system.\n\nSELF-EVOLUTION ONLY. Do not modify the Bikeztagram product.\n\nYour job is deliberately tiny: inspect ONE allowed AutoBot engineering file and produce ONE small, useful repair directly justified by the observed failure evidence. Do not redesign the system. Do not make speculative improvements.\n\nALLOWED FILE: ${target}\n\nTARGET FILE CONTENT:\n--- BEGIN FILE ---\n${targetText}\n--- END FILE ---\n\nOBSERVED FAILURE EVIDENCE:\n${readLearningEvidence()}\n\nREPAIR DIRECTION:\nThe evidence repeatedly reports upstream/local-model request timeouts. If the target contains an upstream request without a bounded abort/deadline, make one small reliability repair that prevents that request from hanging indefinitely. Prefer a standard AbortController/fetch timeout or equivalent minimal bounded-request handling. Keep the existing API and behaviour otherwise. If that specific repair is already present, make the smallest other concrete reliability improvement directly supported by the evidence.\n\nHARD RULES:\n- Only change ${target}.\n- You MUST make a concrete source-code change; returning the original file unchanged is not a valid answer.\n- Do not change product code, workflows, package files, validators, policy, safety gates, secrets, or git configuration.\n- Do not weaken any safety, verification, rollback, provider, or self-evolution-only gate.\n- Make the smallest concrete improvement supported by the evidence.\n- Preserve existing behaviour except where the repair is required.\n- Do not invent test results.\n- Return ONLY the complete contents of ${target}.\n- Do NOT return a diff, patch, markdown fences, explanation, or prose.\n- Preserve the file's shebang and valid source syntax.\n${extra}`;
}

function extractReplacement(text) {
  const cleaned = String(text || '').trim();
  const fenced = cleaned.match(/```(?:javascript|js|mjs)?\s*\n([\s\S]*?)\n```/i);
  let candidate = (fenced ? fenced[1] : cleaned).trim();
  const shebang = candidate.indexOf('#!/usr/bin/env node');
  if (shebang > 0) candidate = candidate.slice(shebang).trim();
  if (!candidate.startsWith('#!/usr/bin/env node')) return '';
  return `${candidate}\n`;
}

async function askModel(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a conservative software repair model. Output only the complete contents of the requested source file.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        max_tokens: maxOutputTokens
      }),
      signal: controller.signal
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`local model HTTP ${response.status}: ${body.slice(-4000)}`);
    const parsed = JSON.parse(body);
    const text = parsed?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error(`local model returned no text: ${body.slice(-4000)}`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function validateReplacement(replacementPath) {
  const syntax = run('node', ['--check', replacementPath]);
  if (syntax.status !== 0) return syntax.stderr || syntax.stdout || 'candidate replacement failed syntax check';

  const targetPath = path.join(root, target);
  const diff = run('git', ['diff', '--no-index', '--unified=3', '--', targetPath, replacementPath]);
  if (diff.status === 0) return 'candidate replacement contains no effective line changes';
  if (diff.status !== 1) return diff.stderr || diff.stdout || 'failed to generate candidate diff';

  const lines = diff.stdout.split(/\r?\n/);
  const diffHeaderIndex = lines.findIndex(line => line.startsWith('diff --git '));
  const oldHeaderIndex = lines.findIndex(line => line.startsWith('--- '));
  const newHeaderIndex = lines.findIndex((line, index) => index > oldHeaderIndex && line.startsWith('+++ '));
  if (diffHeaderIndex < 0 || oldHeaderIndex < 0 || newHeaderIndex < 0) return 'controller could not locate generated diff headers';
  lines[diffHeaderIndex] = `diff --git a/${target} b/${target}`;
  lines[oldHeaderIndex] = `--- a/${target}`;
  lines[newHeaderIndex] = `+++ b/${target}`;
  const patch = `${lines.join('\n').trim()}\n`;
  return { patch };
}

function rollbackCandidate(initial) {
  const current = trackedCodeChanges();
  for (const file of current.filter(file => !initial.has(file))) {
    spawnSync('git', ['restore', '--', file], { cwd: root, stdio: 'ignore' });
  }
}

async function main() {
  if (!allowed.has(target)) throw new Error(`target is not in allowed scope: ${target}`);
  const initial = trackedChanges();
  if (initial.length) throw new Error(`real checkout is dirty before worker: ${initial.join(', ')}`);
  const initialSet = new Set(initial);
  const baseSha = run('git', ['rev-parse', 'HEAD']).stdout.trim();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autobot-local-'));
  const replacementPath = path.join(tempDir, path.basename(target));
  const patchPath = path.join(root, 'builder', 'working', 'autobot-agentic-local-candidate.patch');
  fs.mkdirSync(path.dirname(patchPath), { recursive: true });

  try {
    let raw = await askModel(taskPrompt());
    let replacement = extractReplacement(raw);
    let correctionAttempted = false;
    fs.writeFileSync(path.join(root, 'builder', 'working', 'autobot-agentic-local-model-output.txt'), raw);
    if (!replacement) throw new Error(`model did not return a complete target file:\n${raw.slice(-8000)}`);
    fs.writeFileSync(replacementPath, replacement);

    let validation = validateReplacement(replacementPath);
    if (typeof validation === 'string') {
      correctionAttempted = true;
      raw = await askModel(taskPrompt(`\nA previous candidate failed validation with this exact error:\n${validation}\nThis is a hard failure: you MUST return a changed version of the source, not the original unchanged file. Make the concrete timeout/reliability repair described above, then return ONLY the complete replacement file.`));
      replacement = extractReplacement(raw);
      if (!replacement) throw new Error(`correction model did not return a complete target file:\n${raw.slice(-8000)}`);
      fs.writeFileSync(replacementPath, replacement);
      validation = validateReplacement(replacementPath);
      if (typeof validation === 'string') throw new Error(`candidate replacement failed validation after correction: ${validation}`);
    }

    fs.writeFileSync(patchPath, validation.patch);
    const applyCheck = git('apply', '--check', patchPath);
    if (applyCheck.status !== 0) throw new Error(`controller-generated patch failed validation: ${applyCheck.stderr || applyCheck.stdout}`);
    const stats = git('apply', '--numstat', patchPath);
    if (stats.status !== 0) throw new Error(`controller-generated patch stats failed: ${stats.stderr || stats.stdout}`);
    const effective = stats.stdout.split(/\r?\n/).some(line => {
      const fields = line.trim().split(/\s+/);
      return fields.length >= 3 && Number(fields[0]) + Number(fields[1]) > 0;
    });
    if (!effective) throw new Error('controller-generated patch contains no effective line changes');

    const apply = git('apply', '--whitespace=error', patchPath);
    if (apply.status !== 0) throw new Error(`candidate patch failed to apply: ${apply.stderr || apply.stdout}`);

    const changed = trackedCodeChanges();
    const violations = changed.filter(file => !allowed.has(file));
    if (violations.length) throw new Error(`applied candidate escaped scope: ${violations.join(', ')}`);
    if (!changed.includes(target)) throw new Error('candidate produced no change to the allowed target');

    const syntax = run('node', ['--check', target]);
    if (syntax.status !== 0) throw new Error(`candidate failed syntax check: ${syntax.stderr || syntax.stdout}`);

    const evidence = {
      engine: 'targeted-local-repair',
      protocol: 'complete-file-replacement-controller-diff',
      model,
      apiBase,
      target,
      allowedPaths: [...allowed],
      baseSha,
      changedPaths: changed,
      maxOutputTokens,
      requestTimeoutMs,
      correctionAttempted,
      verified: false,
      provider: 'local-only',
      hostedApiRequired: false,
      at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(root, 'builder', 'working', 'autobot-agentic-local-result.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } catch (error) {
    rollbackCandidate(initialSet);
    throw error;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(`[autobot-targeted-local] ${error.stack || error.message}`);
  process.exit(1);
});
