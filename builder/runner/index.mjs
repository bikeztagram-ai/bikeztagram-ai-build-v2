import { Sandbox } from '@vercel/sandbox';
import { mkdir, writeFile } from 'node:fs/promises';

const REPO_URL = process.env.BUILDER_REPO_URL || 'https://github.com/bikeztagram-ai/bikeztagram-ai-build-v2.git';
const BATCH_ID = process.env.BUILDER_BATCH_ID || 'batch-77';
const BRANCH = process.env.BUILDER_WORKING_BRANCH || `autonomous-builder/${BATCH_ID}`;
const BASE_BRANCH = process.env.BUILDER_BASE_BRANCH || 'main';
const MAX_MINUTES = Math.min(Number(process.env.BUILDER_MAX_MINUTES || 45), 45);
const MAX_PASSES = Math.min(Math.max(Number(process.env.BUILDER_MAX_PASSES || 8), 1), 8);
const GEMINI_MODEL = process.env.BUILDER_GEMINI_MODEL || 'gemini-2.5-flash-lite';
const SANDBOX_ROOT = '/vercel/sandbox';
const REPO_DIR = `${SANDBOX_ROOT}/repo`;
const ASKPASS_PATH = `${SANDBOX_ROOT}/git-askpass.sh`;
const PROTECTED_PATH_PREFIXES = (process.env.BUILDER_PROTECTED_PATHS || '.github/workflows/')
  .split(',').map((x) => x.trim()).filter(Boolean);
const AGENT_CMD = process.env.BUILDER_AGENT_CMD
  ? JSON.parse(process.env.BUILDER_AGENT_CMD)
  : ['npx', '-y', '@google/gemini-cli', '--yolo', '--skip-trust', '--model', GEMINI_MODEL];
const OBJECTIVE = process.env.BUILDER_OBJECTIVE || 'Prepare the autonomous builder execution layer without changing production application behavior.';
const ACCEPTANCE = (process.env.BUILDER_ACCEPTANCE || 'Runner configuration is explicit and bounded.;No automatic merge to main.;Build and relevant verification commands are required before review.')
  .split(';').map((x) => x.trim()).filter(Boolean);
const VERIFY_COMMANDS = (process.env.BUILDER_VERIFY_COMMANDS || 'npm run build,npm run verify:batch76')
  .split(',').map((x) => x.trim()).filter(Boolean);

const safeBranch = (value) => value && value !== 'main' && value !== 'master' && !value.startsWith('production/');
const results = [];

async function command(sandbox, cmd, args = [], cwd = REPO_DIR, env = undefined) {
  const r = await sandbox.runCommand({ cmd, args, cwd, ...(env ? { env } : {}) });
  const result = { command: [cmd, ...args].join(' '), exitCode: r.exitCode, stdout: await r.stdout(), stderr: await r.stderr() };
  results.push(result);
  return result;
}

function describeSandboxError(error) {
  const status = error?.response?.status ?? error?.status ?? error?.response?.statusCode;
  const body = error?.response?.body ?? error?.response?.data ?? error?.json;
  const details = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
  return [error?.message || String(error), status ? `status=${status}` : null, details ? `body=${details}` : null].filter(Boolean).join(' | ');
}

function compact(text, limit = 6000) {
  const value = String(text || '').trim();
  return value.length <= limit ? value : `${value.slice(0, limit)}\n...[truncated]`;
}

function isQuotaFailure(result) {
  const text = `${result?.stdout || ''}\n${result?.stderr || ''}`.toLowerCase();
  return /terminalquot(a|e)error|quota exceeded|exhausted your daily quota|generate_content_free_tier_requests|resource_exhausted/.test(text);
}

function isProtectedPath(path) {
  const normalized = String(path || '').replace(/^\s*[MADRCU?!]{1,2}\s+/, '').trim();
  return PROTECTED_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
}

async function protectControlPlaneFiles(sandbox) {
  const statusResult = await command(sandbox, 'git', ['status', '--short']);
  if (statusResult.exitCode) throw new Error(`git status failed: ${statusResult.stderr}`);
  const changedFiles = statusResult.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  const protectedChanges = changedFiles.map((line) => line.replace(/^[MADRCU?!]{1,2}\s+/, '').trim()).filter(isProtectedPath);
  if (!protectedChanges.length) return [];
  const restore = await command(sandbox, 'git', ['restore', '--source=HEAD', '--staged', '--worktree', '--', '.github/workflows']);
  if (restore.exitCode) throw new Error(`Protected workflow restore failed: ${restore.stderr}`);
  const clean = await command(sandbox, 'git', ['clean', '-fd', '--', '.github/workflows']);
  if (clean.exitCode) throw new Error(`Protected workflow cleanup failed: ${clean.stderr}`);
  return protectedChanges;
}

async function runVerification(sandbox) {
  const failures = [];
  const diffCheck = await command(sandbox, 'git', ['diff', '--check']);
  if (diffCheck.exitCode) failures.push(`git diff --check failed:\n${compact(diffCheck.stderr || diffCheck.stdout)}`);
  for (const spec of VERIFY_COMMANDS) {
    const [cmd, ...args] = spec.split(/\s+/);
    const check = await command(sandbox, cmd, args);
    if (check.exitCode) failures.push(`${spec} failed (exit ${check.exitCode}).\nstdout:\n${compact(check.stdout)}\nstderr:\n${compact(check.stderr)}`);
  }
  return failures;
}

async function pushWorkingBranch(sandbox, gitEnv) {
  const fetch = await command(sandbox, 'git', ['fetch', 'origin', `${BRANCH}:refs/remotes/origin/${BRANCH}`], REPO_DIR, gitEnv);
  if (fetch.exitCode && !/couldn't find remote ref|could not find remote ref/i.test(fetch.stderr)) {
    throw new Error(`git fetch existing working branch failed: ${fetch.stderr}`);
  }
  const push = await command(sandbox, 'git', ['push', '--force-with-lease=refs/heads/' + BRANCH + ':refs/remotes/origin/' + BRANCH, '--set-upstream', 'origin', `HEAD:${BRANCH}`], REPO_DIR, gitEnv);
  if (push.exitCode) throw new Error(`git push failed: ${push.stderr}`);
}

async function main() {
  if (!safeBranch(BRANCH)) throw new Error(`Refusing unsafe branch: ${BRANCH}`);
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required');
  if (!process.env.VERCEL_TOKEN) throw new Error('VERCEL_TOKEN is required');
  if (!process.env.VERCEL_TEAM_ID) throw new Error('VERCEL_TEAM_ID is required');
  if (!process.env.VERCEL_PROJECT_ID) throw new Error('VERCEL_PROJECT_ID is required');
  if (!AGENT_CMD?.length) throw new Error('BUILDER_AGENT_CMD is invalid');

  const gitEnv = { GITHUB_TOKEN: process.env.GITHUB_TOKEN, GIT_ASKPASS: ASKPASS_PATH, GIT_TERMINAL_PROMPT: '0' };
  const agentEnv = { GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_MODEL };
  const startedAt = new Date().toISOString();
  let sandbox; let status = 'FAILED'; let failure = null; let commitSha = null; let passes = 0; let lastFailures = []; let protectedChangesReset = [];

  try {
    try {
      sandbox = await Sandbox.create({ teamId: process.env.VERCEL_TEAM_ID, projectId: process.env.VERCEL_PROJECT_ID, token: process.env.VERCEL_TOKEN, runtime: 'node24', resources: { vcpus: 2 }, persistent: false, timeout: MAX_MINUTES * 60 * 1000, networkPolicy: 'allow-all' });
    } catch (error) { throw new Error(`Sandbox.create failed: ${describeSandboxError(error)}`); }
    await command(sandbox, 'mkdir', ['-p', REPO_DIR], SANDBOX_ROOT);
    const askpass = await command(sandbox, 'sh', ['-lc', `cat > '${ASKPASS_PATH}' <<'EOF'\n#!/bin/sh\ncase "$1" in\n  *Username*) printf '%s\\n' 'x-access-token' ;;\n  *) printf '%s\\n' "$GITHUB_TOKEN" ;;\nesac\nEOF\nchmod 700 '${ASKPASS_PATH}'`], SANDBOX_ROOT, gitEnv);
    if (askpass.exitCode) throw new Error(`Git auth helper setup failed: ${askpass.stderr}`);
    const clone = await command(sandbox, 'git', ['clone', '--branch', BASE_BRANCH, '--depth', '1', REPO_URL, REPO_DIR], SANDBOX_ROOT, gitEnv);
    if (clone.exitCode) throw new Error(`Clone failed: ${clone.stderr}`);
    const checkout = await command(sandbox, 'git', ['checkout', '-b', BRANCH]);
    if (checkout.exitCode) throw new Error(`Branch creation failed: ${checkout.stderr}`);
    const install = await command(sandbox, 'npm', ['install', '--no-audit', '--no-fund', '--no-package-lock']);
    if (install.exitCode) throw new Error(`Dependency install failed: ${install.stderr || install.stdout}`);

    const basePrompt = [
      `Bikeztagram autonomous builder: execute ${BATCH_ID}.`, `Objective: ${OBJECTIVE}`, `Acceptance criteria: ${ACCEPTANCE.join(' | ')}`,
      `Work only on ${BRANCH}; never touch main, merge, deploy production, or provision paid infrastructure.`,
      'Inspect the existing application and implement the objective using the largest coherent in-scope batch possible.',
      'Work on independent in-scope tasks in parallel where safe, but never create conflicting edits.',
      'Do not commit or push; the runner owns Git.',
      'Protected control-plane paths: .github/workflows/**. Do not modify GitHub Actions workflow files during application/product batches; the runner will preserve them unchanged.',
      'You are part of a recovery loop: make real changes, then stop so the runner can verify them.',
      'If previous verification failures are supplied below, diagnose and fix those failures rather than merely reporting them.'
    ].join('\n');

    for (passes = 1; passes <= MAX_PASSES; passes += 1) {
      const failureContext = lastFailures.length ? `\nPrevious verification failures to fix now:\n${lastFailures.map(compact).join('\n\n')}` : '';
      const prompt = `${basePrompt}\n\nPass ${passes} of ${MAX_PASSES}.${failureContext}\n\nBefore ending this pass, inspect your changes and make sure the next verification run has a concrete chance of passing.`;
      const agent = await command(sandbox, AGENT_CMD[0], [...AGENT_CMD.slice(1), '--prompt', prompt], REPO_DIR, agentEnv);
      if (agent.exitCode) {
        lastFailures = [`Agent failed (exit ${agent.exitCode}).\nstdout:\n${compact(agent.stdout)}\nstderr:\n${compact(agent.stderr)}`];
        if (isQuotaFailure(agent)) throw new Error(`Gemini quota exhausted for model ${GEMINI_MODEL}. The autonomous loop stopped immediately instead of wasting remaining passes.\n${lastFailures[0]}`);
        continue;
      }
      lastFailures = await runVerification(sandbox);
      if (lastFailures.length === 0) { status = 'VERIFIED'; break; }
    }
    if (status !== 'VERIFIED') throw new Error(`Autonomous work loop exhausted after ${MAX_PASSES} passes. Last failures:\n${lastFailures.map(compact).join('\n\n')}`);
    protectedChangesReset = await protectControlPlaneFiles(sandbox);
    const statusResult = await command(sandbox, 'git', ['status', '--short']);
    if (!statusResult.stdout.trim()) throw new Error('Verification passed but the agent produced no repository changes outside protected control-plane paths');
    const gitIdentity = await command(sandbox, 'git', ['config', 'user.name', 'Bikeztagram Autonomous Builder']);
    if (gitIdentity.exitCode) throw new Error(`git user.name configuration failed: ${gitIdentity.stderr}`);
    const gitEmail = await command(sandbox, 'git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
    if (gitEmail.exitCode) throw new Error(`git user.email configuration failed: ${gitEmail.stderr}`);
    const add = await command(sandbox, 'git', ['add', '-A']);
    if (add.exitCode) throw new Error(`git add failed: ${add.stderr}`);
    const commit = await command(sandbox, 'git', ['commit', '-m', `builder: complete ${BATCH_ID}`]);
    if (commit.exitCode) throw new Error(`git commit failed: ${commit.stderr}`);
    const shaResult = await command(sandbox, 'git', ['rev-parse', 'HEAD']);
    commitSha = shaResult.stdout.trim() || null;
    await pushWorkingBranch(sandbox, gitEnv);
    status = 'READY_FOR_REVIEW';
  } catch (error) { failure = error instanceof Error ? error.message : String(error); }
  finally {
    if (sandbox) { try { await sandbox.stop(); } catch (error) { failure ??= `Sandbox stop failed: ${describeSandboxError(error)}`; } }
    const report = { batchId: BATCH_ID, objective: OBJECTIVE, baseBranch: BASE_BRANCH, workingBranch: BRANCH, commitSha, geminiModel: GEMINI_MODEL, protectedPaths: PROTECTED_PATH_PREFIXES, protectedChangesReset, maxDurationMinutes: MAX_MINUTES, maxPasses: MAX_PASSES, passesCompleted: Math.min(passes, MAX_PASSES), keepAlive: false, autoMerge: false, autoProductionDeploy: false, status, failure, startedAt, finishedAt: new Date().toISOString(), checks: results };
    await mkdir('./builder/reports', { recursive: true });
    await writeFile(`./builder/reports/${BATCH_ID}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (status !== 'READY_FOR_REVIEW') process.exitCode = 1;
  }
}

main();
