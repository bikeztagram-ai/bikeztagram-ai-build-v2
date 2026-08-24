import { Sandbox } from '@vercel/sandbox';
import { mkdir, writeFile } from 'node:fs/promises';

const REPO_URL = process.env.BUILDER_REPO_URL || 'https://github.com/bikeztagram-ai/bikeztagram-ai-build-v2.git';
const BATCH_ID = process.env.BUILDER_BATCH_ID || 'batch-77';
const BRANCH = process.env.BUILDER_WORKING_BRANCH || `autonomous-builder/${BATCH_ID}`;
const BASE_BRANCH = process.env.BUILDER_BASE_BRANCH || 'main';
const MAX_MINUTES = Math.min(Number(process.env.BUILDER_MAX_MINUTES || 45), 45);
const AGENT_CMD = process.env.BUILDER_AGENT_CMD
  ? JSON.parse(process.env.BUILDER_AGENT_CMD)
  : ['npx', '-y', '@google/gemini-cli', '--yolo'];
const OBJECTIVE = process.env.BUILDER_OBJECTIVE || 'Prepare the autonomous builder execution layer without changing production application behavior.';
const ACCEPTANCE = (process.env.BUILDER_ACCEPTANCE || 'Runner configuration is explicit and bounded.;No automatic merge to main.;Build and relevant verification commands are required before review.')
  .split(';').map((x) => x.trim()).filter(Boolean);
const VERIFY_COMMANDS = (process.env.BUILDER_VERIFY_COMMANDS || 'npm run build,npm run verify:batch76')
  .split(',').map((x) => x.trim()).filter(Boolean);

const safeBranch = (value) => value && value !== 'main' && value !== 'master' && !value.startsWith('production/');
const results = [];

async function command(sandbox, cmd, args = [], cwd = '/workspace/repo', env = undefined) {
  const r = await sandbox.runCommand({ cmd, args, cwd, ...(env ? { env } : {}) });
  const result = { command: [cmd, ...args].join(' '), exitCode: r.exitCode, stdout: await r.stdout(), stderr: await r.stderr() };
  results.push(result);
  return result;
}

function describeSandboxError(error) {
  const status = error?.response?.status ?? error?.status ?? error?.response?.statusCode;
  const body = error?.response?.body ?? error?.response?.data ?? error?.json;
  const details = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
  return [error?.message || String(error), status ? `status=${status}` : null, details ? `body=${details}` : null]
    .filter(Boolean).join(' | ');
}

async function main() {
  if (!safeBranch(BRANCH)) throw new Error(`Refusing unsafe branch: ${BRANCH}`);
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required');
  if (!AGENT_CMD?.length) throw new Error('BUILDER_AGENT_CMD is invalid');

  const gitEnv = {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: bearer ${process.env.GITHUB_TOKEN}`
  };
  const agentEnv = { GEMINI_API_KEY: process.env.GEMINI_API_KEY };
  const startedAt = new Date().toISOString();
  let sandbox;
  try {
    sandbox = await Sandbox.create({
      runtime: 'node24',
      resources: { vcpus: 2 },
      persistent: false,
      timeout: MAX_MINUTES * 60 * 1000
    });
  } catch (error) {
    throw new Error(`Sandbox.create failed: ${describeSandboxError(error)}`);
  }
  let status = 'FAILED';
  let failure = null;
  let commitSha = null;

  try {
    await command(sandbox, 'mkdir', ['-p', '/workspace']);
    const clone = await command(sandbox, 'git', ['clone', '--branch', BASE_BRANCH, '--depth', '1', REPO_URL, '/workspace/repo'], '/workspace', gitEnv);
    if (clone.exitCode) throw new Error(`Clone failed: ${clone.stderr}`);

    const checkout = await command(sandbox, 'git', ['checkout', '-b', BRANCH]);
    if (checkout.exitCode) throw new Error(`Branch creation failed: ${checkout.stderr}`);

    const prompt = [
      `Bikeztagram autonomous builder: execute ${BATCH_ID}.`,
      `Objective: ${OBJECTIVE}`,
      `Acceptance criteria: ${ACCEPTANCE.join(' | ')}`,
      `Work only on ${BRANCH}; never touch main, merge, deploy production, or provision paid infrastructure.`,
      'Inspect the existing application and implement the objective using the largest coherent in-scope batch possible.',
      'Do not commit or push; the runner owns Git.',
      'Before finishing, run the repository build and relevant verification checks.'
    ].join('\n');
    const agent = await command(sandbox, AGENT_CMD[0], [...AGENT_CMD.slice(1), '--prompt', prompt], '/workspace/repo', agentEnv);
    if (agent.exitCode) throw new Error(`Agent failed: ${agent.stderr || agent.stdout}`);

    for (const spec of VERIFY_COMMANDS) {
      const [cmd, ...args] = spec.split(/\s+/);
      const check = await command(sandbox, cmd, args);
      if (check.exitCode) throw new Error(`Verification failed: ${spec}`);
    }

    const statusResult = await command(sandbox, 'git', ['status', '--short']);
    if (!statusResult.stdout.trim()) throw new Error('Agent produced no repository changes');

    const add = await command(sandbox, 'git', ['add', '-A']);
    if (add.exitCode) throw new Error(`git add failed: ${add.stderr}`);
    const commit = await command(sandbox, 'git', ['commit', '-m', `builder: complete ${BATCH_ID}`]);
    if (commit.exitCode) throw new Error(`git commit failed: ${commit.stderr}`);
    const shaResult = await command(sandbox, 'git', ['rev-parse', 'HEAD']);
    commitSha = shaResult.stdout.trim() || null;
    const push = await command(sandbox, 'git', ['push', '--set-upstream', 'origin', BRANCH], '/workspace/repo', gitEnv);
    if (push.exitCode) throw new Error(`git push failed: ${push.stderr}`);

    status = 'READY_FOR_REVIEW';
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    if (sandbox) {
      try { await sandbox.stop(); } catch (error) { failure ??= `Sandbox stop failed: ${describeSandboxError(error)}`; }
    }
    const report = {
      batchId: BATCH_ID,
      objective: OBJECTIVE,
      baseBranch: BASE_BRANCH,
      workingBranch: BRANCH,
      commitSha,
      maxDurationMinutes: MAX_MINUTES,
      keepAlive: false,
      autoMerge: false,
      autoProductionDeploy: false,
      status,
      failure,
      startedAt,
      finishedAt: new Date().toISOString(),
      checks: results
    };
    await mkdir('./builder/reports', { recursive: true });
    await writeFile(`./builder/reports/${BATCH_ID}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (status !== 'READY_FOR_REVIEW') process.exitCode = 1;
  }
}

main();
