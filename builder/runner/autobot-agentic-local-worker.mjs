#!/usr/bin/env node
/**
 * Targeted local AutoBot repair worker.
 *
 * The earlier mini-SWE-agent experiment proved that the local model/server
 * worked, but the 1.5B model could not reliably complete a multi-step shell
 * agent loop before the window expired. This worker deliberately removes that
 * overhead: the model receives one tightly-scoped target plus the failure
 * evidence and proposes one unified diff. The controller validates, optionally
 * asks for one correction, then applies only the allowed file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const target = process.env.AUTOBOT_LOCAL_TARGET || 'builder/runner/ollama-performance-proxy.mjs';
const allowed = new Set((process.env.AUTOBOT_ALLOWED_PATHS || target).split(',').map(s => s.trim()).filter(Boolean));
const model = process.env.AUTOBOT_AGENT_MODEL || 'local-qwen-coder-3b';
const apiBase = process.env.AUTOBOT_AGENT_API_BASE || 'http://127.0.0.1:8080/v1';
const maxOutputTokens = Number(process.env.AUTOBOT_AGENT_MAX_OUTPUT_TOKENS || 900);
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
  return `You are the LOCAL REPAIR MODEL for the Bikeztagram AI autonomous engineering system.\n\nSELF-EVOLUTION ONLY. Do not modify the Bikeztagram product.\n\nYour job is deliberately tiny: inspect ONE allowed AutoBot engineering file and propose ONE small, useful repair directly justified by the observed failure evidence. Do not redesign the system. Do not make speculative improvements.\n\nALLOWED FILE: ${target}\n\nTARGET FILE CONTENT:\n--- BEGIN FILE ---\n${targetText}\n--- END FILE ---\n\nOBSERVED FAILURE EVIDENCE:\n${readLearningEvidence()}\n\nHARD RULES:\n- Only change ${target}.\n- Do not change product code, workflows, package files, validators, policy, safety gates, secrets, or git configuration.\n- Do not weaken any safety, verification, rollback, provider, or self-evolution-only gate.\n- Make the smallest concrete improvement supported by the evidence.\n- Preserve existing behaviour except where the repair is required.\n- Do not invent test results.\n- Return ONLY a standard unified git diff for ${target}; no prose, no markdown fences, no explanation.\n- The diff must be directly applicable with git apply --check.\n${extra}`;
}

function extractDiff(text) {
  const cleaned = String(text || '').trim();
  const fenced = cleaned.match(/```(?:diff|patch)?\s*\n([\s\S]*?)\n```/i);
  const candidate = (fenced ? fenced[1] : cleaned).trim();
  const gitStart = candidate.indexOf('diff --git ');
  if (gitStart >= 0) return candidate.slice(gitStart).trim() + '\n';
  const unifiedStart = candidate.search(/^--- a\//m);
  if (unifiedStart >= 0) return candidate.slice(unifiedStart).trim() + '\n';
  return '';
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
          { role: 'system', content: 'You are a conservative software repair model. Output only a valid unified git diff.' },
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

function validatePatch(patchPath) {
  const check = git('apply', '--check', patchPath);
  if (check.status !== 0) return check.stderr || check.stdout || 'git apply --check failed';
  return '';
}

function rollbackCandidate(initial) {
  for (const file of trackedChanges().filter(file => !initial.has(file))) {
    spawnSync('git', ['restore', '--', file], { cwd: root, stdio: 'ignore' });
    spawnSync('git', ['clean', '-fd', '--', file], { cwd: root, stdio: 'ignore' });
  }
}

async function main() {
  if (!allowed.has(target)) throw new Error(`target is not in allowed scope: ${target}`);
  const initial = trackedChanges();
  if (initial.length) throw new Error(`real checkout is dirty before worker: ${initial.join(', ')}`);
  const initialSet = new Set(initial);
  const baseSha = run('git', ['rev-parse', 'HEAD']).stdout.trim();
  const patch = path.join(root, 'builder', 'working', 'autobot-agentic-local-candidate.patch');
  fs.mkdirSync(path.dirname(patch), { recursive: true });

  let raw = await askModel(taskPrompt());
  let diff = extractDiff(raw);
  let correctionAttempted = false;
  fs.writeFileSync(path.join(root, 'builder', 'working', 'autobot-agentic-local-model-output.txt'), raw);
  if (!diff) throw new Error(`model did not return a unified diff:\n${raw.slice(-8000)}`);
  fs.writeFileSync(patch, diff);

  let validationError = validatePatch(patch);
  if (validationError) {
    correctionAttempted = true;
    raw = await askModel(taskPrompt(`\nA previous proposed diff failed validation with this exact error:\n${validationError}\nCorrect the diff and return ONLY the replacement unified diff.`));
    diff = extractDiff(raw);
    if (!diff) throw new Error(`correction model did not return a unified diff:\n${raw.slice(-8000)}`);
    fs.writeFileSync(patch, diff);
    validationError = validatePatch(patch);
    if (validationError) throw new Error(`candidate patch failed validation after correction: ${validationError}`);
  }

  try {
    const apply = git('apply', '--whitespace=error', patch);
    if (apply.status !== 0) throw new Error(`candidate patch failed to apply: ${apply.stderr || apply.stdout}`);

    const changed = trackedChanges();
    const violations = changed.filter(file => !allowed.has(file));
    if (violations.length) throw new Error(`applied candidate escaped scope: ${violations.join(', ')}`);
    if (!changed.includes(target)) throw new Error('candidate produced no change to the allowed target');

    const syntax = run('node', ['--check', target]);
    if (syntax.status !== 0) throw new Error(`candidate failed syntax check: ${syntax.stderr || syntax.stdout}`);

    const evidence = {
      engine: 'targeted-local-repair',
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
  }
}

main().catch(error => {
  console.error(`[autobot-targeted-local] ${error.stack || error.message}`);
  process.exit(1);
});
