import { Sandbox } from '@vercel/sandbox';
import { mkdir, writeFile } from 'node:fs/promises';

const REPO_URL = process.env.BUILDER_REPO_URL || 'https://github.com/bikeztagram-ai/bikeztagram-ai-build-v2.git';
const BATCH_ID = process.env.BUILDER_BATCH_ID || `batch-${Date.now()}`;
const BRANCH = process.env.BUILDER_WORKING_BRANCH || `autonomous-builder/${BATCH_ID}`;
const BASE_BRANCH = process.env.BUILDER_BASE_BRANCH || 'main';
const MAX_MINUTES = Math.min(Number(process.env.BUILDER_MAX_MINUTES || 45), 45);
const MAX_PASSES = Math.min(Math.max(Number(process.env.BUILDER_MAX_PASSES || 8), 1), 8);
const GEMINI_MODEL = process.env.BUILDER_GEMINI_MODEL || 'gemini-3.5-flash-lite';
const SANDBOX_ROOT = '/vercel/sandbox';
const REPO_DIR = `${SANDBOX_ROOT}/repo`;
const ASKPASS_PATH = `${SANDBOX_ROOT}/git-askpass.sh`;
const PROTECTED_PATH_PREFIXES = (process.env.BUILDER_PROTECTED_PATHS || '.github/workflows/')
  .split(',').map((x) => x.trim()).filter(Boolean);
const AGENT_CMD = process.env.BUILDER_AGENT_CMD
  ? JSON.parse(process.env.BUILDER_AGENT_CMD)
  : ['npx', '-y', '@google/gemini-cli', '--yolo', '--skip-trust', '--model', GEMINI_MODEL];
const AGENT_PROVIDER = process.env.BUILDER_AGENT_PROVIDER || (process.env.BUILDER_AGENT_CMD ? 'external' : 'legacy-gemini');
const OBJECTIVE = process.env.BUILDER_OBJECTIVE || '';
const ACCEPTANCE = (process.env.BUILDER_ACCEPTANCE || '').split(';').map((x) => x.trim()).filter(Boolean);
const VERIFY_COMMANDS = (process.env.BUILDER_VERIFY_COMMANDS || 'npm run build').split(',').map((x) => x.trim()).filter(Boolean);

const safeBranch = (value) => value && value !== 'main' && value !== 'master' && !value.startsWith('production/');
const results = [];

async function command(sandbox, cmd, args = [], cwd = REPO_DIR, env) {
  const r = await sandbox.runCommand({ cmd, args, cwd, ...(env ? { env } : {}) });
  const result = { command: [cmd, ...args].join(' '), exitCode: r.exitCode, stdout: await r.stdout(), stderr: await r.stderr() };
  results.push(result);
  return result;
}

function compact(text, limit = 5000) {
  const value = String(text || '').trim();
  return value.length <= limit ? value : `${value.slice(0, limit)}\n...[truncated]`;
}

function isQuotaFailure(result) {
  const text = `${result?.stdout || ''}\n${result?.stderr || ''}`.toLowerCase();
  return /terminalquot(a|e)error|quota exceeded|exhausted your daily quota|generate_content_free_tier|resource_exhausted|rate limit exceeded/.test(text);
}

function retryHint(result) {
  const text = `${result?.stdout || ''}\n${result?.stderr || ''}`;
  const seconds = text.match(/retry(?:ing)? after\s+(\d+(?:\.\d+)?)\s*s/i)?.[1];
  return seconds ? `Suggested retry delay: ${seconds}s.` : 'No provider retry delay supplied.';
}

function protectedPath(path) {
  const normalized = String(path || '').replace(/^\s*[MADRCU?!]{1,2}\s+/, '').trim();
  return PROTECTED_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
}

async function protectControlPlaneFiles(sandbox) {
  const status = await command(sandbox, 'git', ['status', '--short']);
  if (status.exitCode) throw new Error(`git status failed: ${status.stderr}`);
  const changed = status.stdout.split('\n').filter(Boolean);
  const protectedChanges = changed.map((line) => line.replace(/^[MADRCU?!]{1,2}\s+/, '').trim()).filter(protectedPath);
  if (!protectedChanges.length) return [];
  const restore = await command(sandbox, 'git', ['restore', '--source=HEAD', '--staged', '--worktree', '--', '.github/workflows']);
  if (restore.exitCode) throw new Error(`Protected workflow restore failed: ${restore.stderr}`);
  await command(sandbox, 'git', ['clean', '-fd', '--', '.github/workflows']);
  return protectedChanges;
}

async function verify(sandbox) {
  const failures = [];
  const diff = await command(sandbox, 'git', ['diff', '--check']);
  if (diff.exitCode) failures.push(`git diff --check failed:\n${compact(diff.stderr || diff.stdout)}`);
  for (const spec of VERIFY_COMMANDS) {
    const [cmd, ...args] = spec.split(/\s+/);
    const check = await command(sandbox, cmd, args);
    if (check.exitCode) failures.push(`${spec} failed (exit ${check.exitCode}).\nstdout:\n${compact(check.stdout)}\nstderr:\n${compact(check.stderr)}`);
  }
  return failures;
}

async function publish(sandbox, gitEnv) {
  await command(sandbox, 'git', ['config', 'user.name', 'Bikeztagram Autonomous Builder']);
  await command(sandbox, 'git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  const add = await command(sandbox, 'git', ['add', '-A']);
  if (add.exitCode) throw new Error(`git add failed: ${add.stderr}`);
  const commit = await command(sandbox, 'git', ['commit', '-m', `builder: complete ${BATCH_ID}`]);
  if (commit.exitCode) throw new Error(`git commit failed: ${commit.stderr}`);
  const sha = (await command(sandbox, 'git', ['rev-parse', 'HEAD'])).stdout.trim();
  const fetch = await command(sandbox, 'git', ['fetch', 'origin', `${BRANCH}:refs/remotes/origin/${BRANCH}`], REPO_DIR, gitEnv);
  const exists = fetch.exitCode === 0;
  if (fetch.exitCode && !/couldn't find remote ref|could not find remote ref/i.test(fetch.stderr)) throw new Error(`git fetch failed: ${fetch.stderr}`);
  const args = exists
    ? ['push', '--force-with-lease=refs/heads/' + BRANCH + ':refs/remotes/origin/' + BRANCH, '--set-upstream', 'origin', `HEAD:${BRANCH}`]
    : ['push', '--set-upstream', 'origin', `HEAD:refs/heads/${BRANCH}`];
  const push = await command(sandbox, 'git', args, REPO_DIR, gitEnv);
  if (push.exitCode) throw new Error(`git push failed: ${push.stderr}`);
  return sha;
}

function executionPrompt(pass, failures, checkpointPath) {
  return [
    `BIKEZTAGRAM AUTONOMOUS ENGINEERING WORKER — ${BATCH_ID}`,
    'You are executing a pre-approved engineering task. You are NOT responsible for deciding the product roadmap.',
    `OBJECTIVE:\n${OBJECTIVE}`,
    `ACCEPTANCE:\n${ACCEPTANCE.join('\n- ')}`,
    `PASS: ${pass}/${MAX_PASSES}`,
    `CHECKPOINT: ${checkpointPath}`,
    '',
    'EXECUTION RULES:',
    '- Execute the objective directly. Do not ask what to build next and do not invent unrelated features.',
    '- Treat the objective and acceptance criteria as the authoritative specification.',
    '- Inspect only relevant source. Do not dump or reread the whole repository.',
    '- Make the largest coherent production-quality change that fits the objective and current architecture.',
    '- Preserve working behaviour and existing contracts unless the objective explicitly requires changing them.',
    '- Work iteratively: implement, inspect, run useful checks, fix issues, and continue.',
    '- Use the checkpoint file to record concise progress, completed areas, remaining work and verification findings so later passes can resume without re-planning.',
    '- If a previous verification failure is supplied, fix it first.',
    '- Never modify .github/workflows/** or autonomous-runner infrastructure during a product batch.',
    '- Never commit, push, merge, deploy production or provision paid infrastructure. The runner owns Git and release control.',
    '- Keep your response short; durable state belongs in the repository, not the chat output.',
    failures.length ? `\nPREVIOUS VERIFICATION FAILURES:\n${failures.map(compact).join('\n\n')}` : '',
  ].join('\n');
}

async function main() {
  if (!safeBranch(BRANCH)) throw new Error(`Refusing unsafe branch: ${BRANCH}`);
  if (!OBJECTIVE) throw new Error('BUILDER_OBJECTIVE is required');
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_TEAM_ID || !process.env.VERCEL_PROJECT_ID) throw new Error('Vercel sandbox credentials are required');
  if (!AGENT_CMD?.length) throw new Error('BUILDER_AGENT_CMD is invalid');

  const gitEnv = { GITHUB_TOKEN: process.env.GITHUB_TOKEN, GIT_ASKPASS: ASKPASS_PATH, GIT_TERMINAL_PROMPT: '0' };
  const agentEnv = process.env.GEMINI_API_KEY ? { GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_MODEL } : undefined;
  const startedAt = new Date().toISOString();
  const checkpointPath = `builder/working/${BATCH_ID}.md`;
  let sandbox; let status = 'FAILED'; let failure = null; let commitSha = null; let passes = 0; let failures = []; let quotaDetected = false; let quotaHint = null; let protectedChangesReset = [];

  try {
    sandbox = await Sandbox.create({ teamId: process.env.VERCEL_TEAM_ID, projectId: process.env.VERCEL_PROJECT_ID, token: process.env.VERCEL_TOKEN, runtime: 'node24', resources: { vcpus: 2 }, persistent: false, timeout: MAX_MINUTES * 60 * 1000, networkPolicy: 'allow-all' });
    await command(sandbox, 'sh', ['-lc', `cat > '${ASKPASS_PATH}' <<'EOF'\n#!/bin/sh\ncase "$1" in\n *Username*) printf '%s\\n' 'x-access-token' ;;\n *) printf '%s\\n' "$GITHUB_TOKEN" ;;\nesac\nEOF\nchmod 700 '${ASKPASS_PATH}'`], SANDBOX_ROOT, gitEnv);
    // Clone into a genuinely empty path first. The working/checkpoint directory must only be created after clone.
    const clone = await command(sandbox, 'git', ['clone', '--branch', BASE_BRANCH, '--depth', '1', REPO_URL, REPO_DIR], SANDBOX_ROOT, gitEnv);
    if (clone.exitCode) throw new Error(`Clone failed: ${clone.stderr}`);
    const checkout = await command(sandbox, 'git', ['checkout', '-b', BRANCH]);
    if (checkout.exitCode) throw new Error(`Branch creation failed: ${checkout.stderr}`);
    await command(sandbox, 'mkdir', ['-p', `${REPO_DIR}/builder/working`]);
    const install = await command(sandbox, 'npm', ['install', '--no-audit', '--no-fund', '--no-package-lock']);
    if (install.exitCode) throw new Error(`Dependency install failed: ${install.stderr || install.stdout}`);

    await writeFile(`${REPO_DIR}/${checkpointPath}`, `# ${BATCH_ID}\n\n## Objective\n${OBJECTIVE}\n\n## Status\nStarted.\n\n## Working rule\nExecute the supplied objective; do not invent roadmap work.\n`);

    for (passes = 1; passes <= MAX_PASSES; passes += 1) {
      const prompt = executionPrompt(passes, failures, checkpointPath);
      const agent = await command(sandbox, AGENT_CMD[0], [...AGENT_CMD.slice(1), '--prompt', prompt], REPO_DIR, agentEnv);
      if (isQuotaFailure(agent)) {
        quotaDetected = true;
        quotaHint = retryHint(agent);
        failures = [`Provider quota detected during pass ${passes}. ${quotaHint}`];
        break;
      }
      if (agent.exitCode) {
        failures = [`Agent failed (exit ${agent.exitCode}).\nstdout:\n${compact(agent.stdout)}\nstderr:\n${compact(agent.stderr)}`];
        continue;
      }
      failures = await verify(sandbox);
      if (!failures.length) { status = 'VERIFIED'; break; }
    }

    if (quotaDetected) {
      const postQuota = await verify(sandbox);
      if (!postQuota.length) { status = 'VERIFIED'; failures = []; }
      else { failures.push(`Post-quota verification incomplete:\n${postQuota.join('\n\n')}`); status = 'PAUSED_FOR_QUOTA'; failure = `Provider quota detected; stopped further agent passes and preserved the branch. ${quotaHint || ''}`.trim(); }
    }

    if (!['VERIFIED', 'PAUSED_FOR_QUOTA'].includes(status)) throw new Error(`Task loop exhausted after ${MAX_PASSES} passes.\n${failures.map(compact).join('\n\n')}`);
    protectedChangesReset = await protectControlPlaneFiles(sandbox);
    const statusResult = await command(sandbox, 'git', ['status', '--short']);
    if (!statusResult.stdout.trim()) throw new Error('No repository changes were produced. Refusing to publish an empty batch.');
    commitSha = await publish(sandbox, gitEnv);
    if (status === 'VERIFIED') status = 'READY_FOR_REVIEW';
  } catch (error) { failure = error instanceof Error ? error.message : String(error); }
  finally {
    if (sandbox) { try { await sandbox.stop(); } catch (error) { failure ||= String(error); } }
    await mkdir('./builder/reports', { recursive: true });
    const report = { batchId: BATCH_ID, objective: OBJECTIVE, agentProvider: AGENT_PROVIDER, geminiModel: AGENT_PROVIDER === 'legacy-gemini' ? GEMINI_MODEL : null, baseBranch: BASE_BRANCH, workingBranch: BRANCH, commitSha, maxDurationMinutes: MAX_MINUTES, maxPasses: MAX_PASSES, passesCompleted: Math.min(passes, MAX_PASSES), quotaDetected, quotaHint, protectedChangesReset, autoMerge: false, autoProductionDeploy: false, status, failure, verificationFailures: failures, startedAt, finishedAt: new Date().toISOString(), checks: results };
    await writeFile(`./builder/reports/${BATCH_ID}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!['READY_FOR_REVIEW', 'PAUSED_FOR_QUOTA'].includes(status)) process.exitCode = 1;
  }
}

main();
