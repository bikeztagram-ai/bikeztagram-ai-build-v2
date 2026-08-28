import { Sandbox } from '@vercel/sandbox';
import { mkdir, writeFile } from 'node:fs/promises';

const REPO_URL = process.env.BUILDER_REPO_URL || 'https://github.com/bikeztagram-ai/bikeztagram-ai-build-v2.git';
const BATCH_ID = process.env.BUILDER_BATCH_ID || `batch-${Date.now()}`;
const BRANCH = process.env.BUILDER_WORKING_BRANCH || `autonomous-builder/${BATCH_ID}`;
const BASE_BRANCH = process.env.BUILDER_BASE_BRANCH || 'main';
const MAX_MINUTES = Math.min(Number(process.env.BUILDER_MAX_MINUTES || 45), 45);
const MAX_PASSES = Math.min(Math.max(Number(process.env.BUILDER_MAX_PASSES || 8), 1), 8);
const SANDBOX_ROOT = '/vercel/sandbox';
const REPO_DIR = `${SANDBOX_ROOT}/repo`;
const ASKPASS_PATH = `${SANDBOX_ROOT}/git-askpass.sh`;
const PROTECTED_PATH_PREFIXES = (process.env.BUILDER_PROTECTED_PATHS || '.github/workflows/').split(',').map((x) => x.trim()).filter(Boolean);
const AGENT_CMD = process.env.BUILDER_AGENT_CMD ? JSON.parse(process.env.BUILDER_AGENT_CMD) : ['npx', '-y', '@openai/codex', 'exec', '--model', 'gpt-5.3-codex', '--dangerously-bypass-approvals-and-sandbox'];
const OBJECTIVE = process.env.BUILDER_OBJECTIVE || 'Improve Bikeztagram based on the highest-impact product weakness found in the repository.';
const ACCEPTANCE = (process.env.BUILDER_ACCEPTANCE || 'Real product behaviour improves.;Build and relevant verification commands pass.;No automatic merge to main.;No Gemini usage.')
  .split(';').map((x) => x.trim()).filter(Boolean);
const VERIFY_COMMANDS = (process.env.BUILDER_VERIFY_COMMANDS || 'npm run build').split(',').map((x) => x.trim()).filter(Boolean);
const safeBranch = (value) => value && value !== 'main' && value !== 'master' && !value.startsWith('production/');
const results = [];

async function command(sandbox, cmd, args = [], cwd = REPO_DIR, env) {
  const r = await sandbox.runCommand({ cmd, args, cwd, ...(env ? { env } : {}) });
  const result = { command: [cmd, ...args].join(' '), exitCode: r.exitCode, stdout: await r.stdout(), stderr: await r.stderr() };
  results.push(result); return result;
}
const compact = (text, limit = 6000) => { const value = String(text || '').trim(); return value.length <= limit ? value : `${value.slice(0, limit)}\n...[truncated]`; };
function isProtectedPath(file) { const normalized = String(file || '').replace(/^\s*[MADRCU?!]{1,2}\s+/, '').trim(); return PROTECTED_PATH_PREFIXES.some((p) => normalized === p || normalized.startsWith(p)); }
async function protectControlPlaneFiles(sandbox) {
  const status = await command(sandbox, 'git', ['status', '--short']);
  if (status.exitCode) throw new Error(`git status failed: ${status.stderr}`);
  const protectedChanges = status.stdout.split('\n').map((x) => x.trim()).filter(Boolean).filter(isProtectedPath);
  if (!protectedChanges.length) return [];
  const restore = await command(sandbox, 'git', ['restore', '--source=HEAD', '--staged', '--worktree', '--', '.github/workflows']);
  if (restore.exitCode) throw new Error(`protected workflow restore failed: ${restore.stderr}`);
  await command(sandbox, 'git', ['clean', '-fd', '--', '.github/workflows']);
  return protectedChanges;
}
async function verify(sandbox) {
  const failures = [];
  const diff = await command(sandbox, 'git', ['diff', '--check']);
  if (diff.exitCode) failures.push(`git diff --check failed: ${compact(diff.stderr || diff.stdout)}`);
  for (const spec of VERIFY_COMMANDS) { const [cmd, ...args] = spec.split(/\s+/); const r = await command(sandbox, cmd, args); if (r.exitCode) failures.push(`${spec} failed (exit ${r.exitCode})\n${compact(r.stderr || r.stdout)}`); }
  return failures;
}
async function publish(sandbox, gitEnv) {
  await command(sandbox, 'git', ['config', 'user.name', 'Bikeztagram Autonomous Builder']);
  await command(sandbox, 'git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  const add = await command(sandbox, 'git', ['add', '-A']); if (add.exitCode) throw new Error(`git add failed: ${add.stderr}`);
  const commit = await command(sandbox, 'git', ['commit', '-m', `builder: complete ${BATCH_ID}`]); if (commit.exitCode) throw new Error(`git commit failed: ${commit.stderr}`);
  const sha = await command(sandbox, 'git', ['rev-parse', 'HEAD']);
  const push = await command(sandbox, 'git', ['push', '--set-upstream', 'origin', `HEAD:${BRANCH}`], REPO_DIR, gitEnv); if (push.exitCode) throw new Error(`git push failed: ${push.stderr}`);
  return sha.stdout.trim();
}
async function main() {
  if (!safeBranch(BRANCH)) throw new Error(`Refusing unsafe branch: ${BRANCH}`);
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_TEAM_ID || !process.env.VERCEL_PROJECT_ID) throw new Error('Vercel sandbox credentials are required');
  const gitEnv = { GITHUB_TOKEN: process.env.GITHUB_TOKEN, GIT_ASKPASS: ASKPASS_PATH, GIT_TERMINAL_PROMPT: '0' };
  const agentEnv = { OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  let sandbox; let status = 'FAILED'; let failure = null; let commitSha = null; let passesCompleted = 0; let failures = [];
  try {
    sandbox = await Sandbox.create({ teamId: process.env.VERCEL_TEAM_ID, projectId: process.env.VERCEL_PROJECT_ID, token: process.env.VERCEL_TOKEN, runtime: 'node24', resources: { vcpus: 2 }, persistent: false, timeout: MAX_MINUTES * 60 * 1000, networkPolicy: 'allow-all' });
    await command(sandbox, 'sh', ['-lc', `mkdir -p '${REPO_DIR}' && printf '#!/bin/sh\nprintf "%s\\n" "$GITHUB_TOKEN"\n' > '${ASKPASS_PATH}' && chmod 700 '${ASKPASS_PATH}'`], SANDBOX_ROOT, gitEnv);
    const clone = await command(sandbox, 'git', ['clone', '--branch', BASE_BRANCH, '--depth', '1', REPO_URL, REPO_DIR], SANDBOX_ROOT, gitEnv); if (clone.exitCode) throw new Error(`clone failed: ${clone.stderr}`);
    const checkout = await command(sandbox, 'git', ['checkout', '-b', BRANCH]); if (checkout.exitCode) throw new Error(`branch creation failed: ${checkout.stderr}`);
    const install = await command(sandbox, 'npm', ['install', '--no-audit', '--no-fund', '--no-package-lock']); if (install.exitCode) throw new Error(`dependency install failed: ${install.stderr || install.stdout}`);
    const prompt = [`Build Bikeztagram, not just tooling.`, `Objective: ${OBJECTIVE}`, `Acceptance: ${ACCEPTANCE.join(' | ')}`, `You are the engineering worker. Use the repository's product-first priorities and inspect existing implementation before changing it.`, `Make the largest coherent, high-impact in-scope improvement you can safely verify in this run.`, `Never use Gemini or Google model APIs. Do not modify .github/workflows/**. Do not merge or deploy production. Do not commit/push.`, `Prioritise actual rendering, director intelligence, storytelling, audio, and mobile UX over housekeeping.`, `Run relevant tests/build checks before stopping.`].join('\n');
    for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
      passesCompleted = pass;
      const agent = await command(sandbox, AGENT_CMD[0], [...AGENT_CMD.slice(1), prompt], REPO_DIR, agentEnv);
      if (agent.exitCode) { failures = [`Codex failed (exit ${agent.exitCode})\n${compact(agent.stderr || agent.stdout)}`]; continue; }
      failures = await verify(sandbox);
      if (!failures.length) { status = 'VERIFIED'; break; }
    }
    if (status !== 'VERIFIED') throw new Error(`Builder verification failed after ${passesCompleted} passes:\n${failures.join('\n\n')}`);
    const protectedChangesReset = await protectControlPlaneFiles(sandbox);
    const finalStatus = await command(sandbox, 'git', ['status', '--short']);
    if (!finalStatus.stdout.trim()) throw new Error('Verification passed but no product changes were produced.');
    commitSha = await publish(sandbox, gitEnv);
    status = 'READY_FOR_REVIEW';
    console.log(`[autobot] protected changes reset: ${protectedChangesReset.length}`);
  } catch (error) { failure = error instanceof Error ? error.message : String(error); }
  finally {
    if (sandbox) { try { await sandbox.stop(); } catch (error) { failure ??= String(error); } }
    await mkdir('./builder/reports', { recursive: true });
    await writeFile(`./builder/reports/${BATCH_ID}.json`, JSON.stringify({ batchId:BATCH_ID, objective:OBJECTIVE, workingBranch:BRANCH, commitSha, provider:'openai-codex', model:'gpt-5.3-codex', passesCompleted, maxPasses:MAX_PASSES, maxDurationMinutes:MAX_MINUTES, status, failure, gemini:'forbidden', autoMerge:false, autoProductionDeploy:false, finishedAt:new Date().toISOString(), checks:results }, null, 2));
    if (status !== 'READY_FOR_REVIEW') process.exitCode = 1;
  }
}
main();
