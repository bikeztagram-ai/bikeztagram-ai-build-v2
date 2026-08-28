import { Sandbox } from '@vercel/sandbox';
import { mkdir, writeFile } from 'node:fs/promises';

const REPO_URL = process.env.BUILDER_REPO_URL || 'https://github.com/bikeztagram-ai/bikeztagram-ai-build-v2.git';
const BATCH_ID = process.env.BUILDER_BATCH_ID || `batch-${Date.now()}`;
const BRANCH = process.env.BUILDER_WORKING_BRANCH || `autonomous-builder/${BATCH_ID}`;
const BASE_BRANCH = process.env.BUILDER_BASE_BRANCH || 'main';
const MAX_MINUTES = Math.min(Number(process.env.BUILDER_MAX_MINUTES || 45), 45);
const MAX_PASSES = Math.min(Math.max(Number(process.env.BUILDER_MAX_PASSES || 8), 1), 8);
const CODEX_MODEL = process.env.BUILDER_CODEX_MODEL || 'gpt-5.3-codex';
const ROOT = '/vercel/sandbox';
const REPO_DIR = `${ROOT}/repo`;
const ASKPASS = `${ROOT}/git-askpass.sh`;
const PROTECTED = (process.env.BUILDER_PROTECTED_PATHS || '.github/workflows/').split(',').map(x => x.trim()).filter(Boolean);
const AGENT_CMD = process.env.BUILDER_AGENT_CMD ? JSON.parse(process.env.BUILDER_AGENT_CMD) : ['npx', '-y', '@openai/codex@latest', 'exec', '--sandbox', 'workspace-write', '--ephemeral', '--model', CODEX_MODEL];
const OBJECTIVE = process.env.BUILDER_OBJECTIVE || '';
const ACCEPTANCE = (process.env.BUILDER_ACCEPTANCE || '').split(';').map(x => x.trim()).filter(Boolean);
const VERIFY_COMMANDS = (process.env.BUILDER_VERIFY_COMMANDS || 'npm run build').split(',').map(x => x.trim()).filter(Boolean);
const results = [];
const compact = (value, limit = 12000) => { const s = String(value || '').trim(); return s.length <= limit ? s : `${s.slice(0, limit)}\n...[truncated]`; };
const output = r => `${r?.stdout || ''}\n${r?.stderr || ''}`.toLowerCase();
const providerFailure = r => r?.exitCode !== 0 && /api key|authentication|unauthenticated|permission denied|forbidden|\b401\b|\b403\b|\b404\b|model.*not found|invalid model/.test(output(r));
const quotaFailure = r => /quota|rate limit|too many requests|resource exhausted|\b429\b|usage limit|credit.*depleted/.test(output(r));
const safeBranch = b => b && b !== 'main' && b !== 'master' && !b.startsWith('production/');

async function run(sandbox, cmd, args = [], cwd = REPO_DIR, env) {
  const r = await sandbox.runCommand({ cmd, args, cwd, ...(env ? { env } : {}) });
  const result = { command: [cmd, ...args].join(' '), exitCode: r.exitCode, stdout: compact(await r.stdout()), stderr: compact(await r.stderr()) };
  results.push(result);
  return result;
}

function prompt(pass, failures) {
  return [
    `BIKEZTAGRAM AUTONOMOUS ENGINEERING WORKER — ${BATCH_ID}`,
    'Use OpenAI Codex as the sole engineering agent. Gemini is not permitted.',
    'Execute ONLY the supplied objective and acceptance criteria. Do not invent unrelated roadmap work.',
    `OBJECTIVE:\n${OBJECTIVE}`,
    `ACCEPTANCE:\n- ${ACCEPTANCE.join('\n- ')}`,
    `PASS: ${pass}/${MAX_PASSES}`,
    failures.length ? `PREVIOUS VERIFICATION FAILURES:\n${failures.join('\n\n')}` : '',
    'Inspect the relevant repository files, implement the largest coherent in-scope improvement you can safely complete, run useful checks, and fix failures before stopping.',
    'Prefer substantive production improvements over cosmetic edits. Preserve working contracts. Do not modify .github/workflows/**, do not merge, deploy production, or change protected infrastructure.',
    `Record concise progress in builder/working/${BATCH_ID}.md when the objective is large enough to require continuation.`,
    'Do not commit or push; the runner owns Git.'
  ].filter(Boolean).join('\n');
}

async function verify(sandbox) {
  const failures = [];
  const diff = await run(sandbox, 'git', ['diff', '--check']);
  if (diff.exitCode) failures.push(`git diff --check failed: ${compact(diff.stderr || diff.stdout)}`);
  for (const spec of VERIFY_COMMANDS) {
    const [cmd, ...args] = spec.split(/\s+/);
    const r = await run(sandbox, cmd, args);
    if (r.exitCode) failures.push(`${spec} failed (exit ${r.exitCode}).\n${compact(r.stderr || r.stdout)}`);
  }
  return failures;
}

async function protect(sandbox) {
  const status = await run(sandbox, 'git', ['status', '--short']);
  if (status.exitCode) throw new Error(`git status failed: ${status.stderr}`);
  const changed = status.stdout.split('\n').filter(Boolean);
  const blocked = changed.map(x => x.replace(/^[MADRCU?!]{1,2}\s+/, '').trim()).filter(p => PROTECTED.some(prefix => p === prefix || p.startsWith(prefix)));
  for (const prefix of PROTECTED) {
    await run(sandbox, 'git', ['restore', '--source=HEAD', '--staged', '--worktree', '--', prefix]);
    await run(sandbox, 'git', ['clean', '-fd', '--', prefix]);
  }
  return blocked;
}

async function publish(sandbox, gitEnv) {
  await run(sandbox, 'git', ['config', 'user.name', 'Bikeztagram Autonomous Builder']);
  await run(sandbox, 'git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  const add = await run(sandbox, 'git', ['add', '-A']);
  if (add.exitCode) throw new Error(`git add failed: ${add.stderr}`);
  const commit = await run(sandbox, 'git', ['commit', '-m', `builder: complete ${BATCH_ID}`]);
  if (commit.exitCode) throw new Error(`git commit failed: ${commit.stderr}`);
  const sha = (await run(sandbox, 'git', ['rev-parse', 'HEAD'])).stdout.trim();
  const fetch = await run(sandbox, 'git', ['fetch', 'origin', `${BRANCH}:refs/remotes/origin/${BRANCH}`], REPO_DIR, gitEnv);
  const args = fetch.exitCode === 0
    ? ['push', '--force-with-lease=refs/heads/' + BRANCH + ':refs/remotes/origin/' + BRANCH, '--set-upstream', 'origin', `HEAD:${BRANCH}`]
    : ['push', '--set-upstream', 'origin', `HEAD:refs/heads/${BRANCH}`];
  const push = await run(sandbox, 'git', args, REPO_DIR, gitEnv);
  if (push.exitCode) throw new Error(`git push failed: ${push.stderr}`);
  return sha;
}

async function main() {
  if (!safeBranch(BRANCH)) throw new Error(`Refusing unsafe branch: ${BRANCH}`);
  if (!OBJECTIVE) throw new Error('BUILDER_OBJECTIVE is required');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required; Gemini credentials are not accepted');
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_TEAM_ID || !process.env.VERCEL_PROJECT_ID) throw new Error('Vercel sandbox credentials are required');
  const gitEnv = { GITHUB_TOKEN: process.env.GITHUB_TOKEN, GIT_ASKPASS: ASKPASS, GIT_TERMINAL_PROMPT: '0' };
  const agentEnv = { OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  let sandbox; let status = 'FAILED'; let failure = null; let commitSha = null; let passes = 0; let failures = []; let protectedChangesReset = []; let quotaDetected = false;
  const startedAt = new Date().toISOString();
  try {
    sandbox = await Sandbox.create({ teamId: process.env.VERCEL_TEAM_ID, projectId: process.env.VERCEL_PROJECT_ID, token: process.env.VERCEL_TOKEN, runtime: 'node24', resources: { vcpus: 4 }, persistent: false, timeout: MAX_MINUTES * 60 * 1000, networkPolicy: 'allow-all' });
    const askpass = await run(sandbox, 'sh', ['-lc', `cat > '${ASKPASS}' <<'EOF'\n#!/bin/sh\ncase "$1" in\n *Username*) printf '%s\\n' 'x-access-token' ;;\n *) printf '%s\\n' "$GITHUB_TOKEN" ;;\nesac\nEOF\nchmod 700 '${ASKPASS}'`], ROOT, gitEnv);
    if (askpass.exitCode) throw new Error(`Git auth setup failed: ${askpass.stderr}`);
    const clone = await run(sandbox, 'git', ['clone', '--branch', BASE_BRANCH, '--depth', '1', REPO_URL, REPO_DIR], ROOT, gitEnv);
    if (clone.exitCode) throw new Error(`Clone failed: ${clone.stderr}`);
    const branch = await run(sandbox, 'git', ['checkout', '-b', BRANCH]);
    if (branch.exitCode) throw new Error(`Branch creation failed: ${branch.stderr}`);
    const install = await run(sandbox, 'npm', ['install', '--no-audit', '--no-fund', '--no-package-lock']);
    if (install.exitCode) throw new Error(`Dependency install failed: ${install.stderr || install.stdout}`);

    for (passes = 1; passes <= MAX_PASSES; passes++) {
      const args = [...AGENT_CMD.slice(1), prompt(passes, failures)];
      const agent = await run(sandbox, AGENT_CMD[0], args, REPO_DIR, agentEnv);
      if (quotaFailure(agent)) { quotaDetected = true; failures = [`OpenAI quota/rate limit detected on pass ${passes}.\n${compact(agent.stderr || agent.stdout)}`]; break; }
      if (providerFailure(agent)) { failures = [`OpenAI Codex provider/model failure on pass ${passes}.\n${compact(agent.stderr || agent.stdout)}`]; break; }
      if (agent.exitCode) { failures = [`Codex failed on pass ${passes} (exit ${agent.exitCode}).\n${compact(agent.stderr || agent.stdout)}`]; continue; }
      protectedChangesReset = await protect(sandbox);
      failures = await verify(sandbox);
      if (!failures.length) { status = 'VERIFIED'; break; }
    }

    if (quotaDetected) {
      const post = await verify(sandbox);
      if (!post.length && (await run(sandbox, 'git', ['status', '--short'])).stdout.trim()) { status = 'VERIFIED'; failures = []; }
      else { status = 'PAUSED_FOR_QUOTA'; failures.push(...post); }
    }
    if (status !== 'VERIFIED' && status !== 'PAUSED_FOR_QUOTA') throw new Error(`Autonomous work loop exhausted after ${MAX_PASSES} passes.\n${failures.join('\n\n')}`);
    protectedChangesReset = [...new Set([...protectedChangesReset, ...(await protect(sandbox))])];
    const changed = await run(sandbox, 'git', ['status', '--short']);
    if (!changed.stdout.trim()) throw new Error('No repository changes were produced outside protected paths.');
    commitSha = await publish(sandbox, gitEnv);
    if (status === 'VERIFIED') status = 'READY_FOR_REVIEW';
  } catch (error) { failure = error instanceof Error ? error.message : String(error); }
  finally {
    if (sandbox) { try { await sandbox.stop(); } catch {} }
    const report = { batchId: BATCH_ID, objective: OBJECTIVE, provider: 'openai-codex', model: CODEX_MODEL, baseBranch: BASE_BRANCH, workingBranch: BRANCH, commitSha, protectedPaths: PROTECTED, protectedChangesReset, maxDurationMinutes: MAX_MINUTES, maxPasses: MAX_PASSES, passesCompleted: Math.min(passes, MAX_PASSES), quotaDetected, autoMerge: false, autoProductionDeploy: false, status, failure, failures, startedAt, finishedAt: new Date().toISOString(), checks: results };
    await mkdir('./builder/reports', { recursive: true });
    await writeFile(`./builder/reports/${BATCH_ID}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!['READY_FOR_REVIEW', 'PAUSED_FOR_QUOTA'].includes(status)) process.exitCode = 1;
  }
}

main();
