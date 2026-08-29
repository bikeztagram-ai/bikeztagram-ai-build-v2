#!/usr/bin/env node
/**
 * AI engineering layer for the sustained builder.
 * Deterministic queue work remains the first gate; when it is exhausted,
 * OpenAI Codex becomes the engineering worker and keeps improving the product
 * until the shared time budget expires.
 */
import { spawnSync, execFileSync } from 'node:child_process';

const root = process.cwd();
const requestedMinutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '360', 10);
// Safety ceiling only; the requested time budget is the real stop condition.
const maxPasses = Math.max(1000, Number.parseInt(process.env.AUTOBOT_CODEX_PASSES || '1000', 10));
const model = process.env.BUILDER_CODEX_MODEL || 'gpt-5.3-codex';
const started = Date.now();
let pass = 0;
let previousFailure = '';

if (!process.env.OPENAI_API_KEY) {
  console.error('[autobot] OPENAI_API_KEY is unavailable; refusing to report a successful AI build.');
  process.exit(2);
}

const minutesLeft = () => Math.max(0, requestedMinutes - ((Date.now() - started) / 60000));
const gitStatus = () => execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
const build = () => {
  const timeout = Math.max(60_000, Math.min(minutesLeft() * 60_000, 15 * 60_000));
  const result = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', env: process.env, timeout });
  return result.status === 0;
};

while (pass < maxPasses && minutesLeft() > 1) {
  pass += 1;
  const before = gitStatus();
  const prompt = [
    'You are the primary autonomous engineer for Bikeztagram AI.',
    'Use OpenAI Codex only. Gemini and Google model APIs are forbidden.',
    'This is a real product build session, not a planning exercise.',
    'Inspect the current repository, durable project memory, roadmap and existing implementation before changing anything.',
    'Choose the highest-impact unfinished product capability and implement it end-to-end.',
    'Prioritise real user-visible quality: intelligent media selection, cinematic storytelling, motion, transitions, pacing, audio, export/render quality, robust media analysis, and Android-friendly UX.',
    'Do not spend the pass on cosmetic refactors, documentation-only work, duplicate tests, or builder infrastructure unless necessary to unlock product quality.',
    'Do not modify .github/workflows/**. Do not change secrets. Do not deploy production. Do not merge. Do not commit or push; the workflow owns Git.',
    'Run relevant verification and npm run build. If validation fails, diagnose and fix it before finishing the pass.',
    'If the first improvement is complete, immediately inspect for the next highest-value improvement and implement it too.',
    previousFailure ? `Previous pass validation issue:\n${previousFailure}` : '',
    `Codex pass ${pass}/${maxPasses}; shared time remaining is about ${minutesLeft().toFixed(0)} minutes.`,
    'Leave the working tree with real, coherent product changes whenever a safe improvement is possible.'
  ].filter(Boolean).join('\n');

  // Codex exec uses CODEX_API_KEY for explicit API-key authentication.
  // Keep the repository secret named OPENAI_API_KEY, but pass it to the
  // child process under Codex's exec-specific auth variable.
  const codexEnv = { ...process.env, CODEX_API_KEY: process.env.OPENAI_API_KEY };
  delete codexEnv.OPENAI_API_KEY;
  const timeout = Math.max(60_000, Math.min(minutesLeft() * 60_000, 55 * 60_000));
  const result = spawnSync('npx', ['-y', '@openai/codex@latest', 'exec', '--sandbox', 'workspace-write', '--ephemeral', '--model', model, prompt], {
    cwd: root,
    stdio: 'inherit',
    env: codexEnv,
    timeout,
  });

  if (result.error) {
    previousFailure = result.error.message;
    console.error(`[autobot] Codex pass ${pass} failed to start: ${previousFailure}`);
    continue;
  }

  try {
    execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
  } catch {
    previousFailure = 'git diff --check failed; fix whitespace/conflict issues before continuing.';
    continue;
  }

  const after = gitStatus();
  if (after !== before) {
    if (!build()) previousFailure = 'npm run build failed after this pass; fix the build before the next pass.';
    else {
      previousFailure = '';
      console.log(`[autobot] Codex pass ${pass} produced verified product changes.`);
    }
  } else {
    console.log(`[autobot] Codex pass ${pass} produced no new diff; immediately starting another engineering pass.`);
  }
}

const elapsed = ((Date.now() - started) / 60000).toFixed(2);
console.log(`[autobot] AI engineering layer finished after ${pass} Codex passes and ${elapsed} minutes.`);
