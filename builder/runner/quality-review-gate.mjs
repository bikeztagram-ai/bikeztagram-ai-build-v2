import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile } from 'node:fs/promises';

const model = process.env.BUILDER_GEMINI_MODEL || 'flash-lite';
const cliVersion = process.env.BUILDER_GEMINI_CLI_VERSION || '0.55.1';
const branch = process.env.BUILDER_WORKING_BRANCH;
const batchId = process.env.BUILDER_BATCH_ID || 'unknown-batch';
const objective = process.env.BUILDER_OBJECTIVE || '';
const reportPath = `builder/working/${batchId}-quality-review.md`;

function exec(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (x) => { stdout += x; });
    child.stderr.on('data', (x) => { stderr += x; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function compact(value, limit = 16000) {
  const text = String(value || '').trim();
  return text.length <= limit ? text : `${text.slice(0, limit)}\n...[truncated]`;
}

function highRisk(paths, insertions, deletions) {
  const joined = paths.join('\n').toLowerCase();
  const riskyPath = /(renderer|director|music|audio|video|edit|ai|api\/|package\.json|vite|vercel|config\/)/.test(joined);
  const largeDiff = insertions + deletions >= 220;
  return riskyPath || largeDiff || paths.length >= 8;
}

async function writeFailure(message) {
  try {
    await mkdir('builder/working', { recursive: true });
    await appendFile(reportPath, `# ${batchId} — Quality Gate\n\n**Result:** ERROR\n\n${message}\n`);
  } catch {
    // The workflow's main failure remains the authoritative signal.
  }
}

function acceptableDiffExit(code) {
  // git diff --no-index returns 0 for identical trees and 1 when differences exist.
  return code === 0 || code === 1;
}

function normalizePath(value, prefixes) {
  let text = String(value || '').trim();
  for (const prefix of prefixes) {
    const token = `${prefix}/`;
    if (text.startsWith(token)) {
      text = text.slice(token.length);
      break;
    }
  }
  return text;
}

async function main() {
  if (!branch) throw new Error('BUILDER_WORKING_BRANCH is required');
  if (!objective) throw new Error('BUILDER_OBJECTIVE is required');

  // Resumed builder branches can be based on an older main revision. Avoid every
  // merge-base, shallow-ref and remote-tracking assumption by comparing two
  // materialized committed trees directly.
  const mainDir = '/tmp/bikeztagram-quality-main';
  const branchDir = '/tmp/bikeztagram-quality-branch';
  const clean = await exec('rm', ['-rf', mainDir, branchDir]);
  if (clean.code !== 0) {
    const message = `Could not prepare quality-gate temp directories.\nstderr: ${compact(clean.stderr, 3000)}`;
    await writeFailure(message);
    throw new Error(message);
  }

  const makeDirs = await exec('mkdir', ['-p', mainDir, branchDir]);
  if (makeDirs.code !== 0) {
    const message = `Could not create quality-gate temp directories.\nstderr: ${compact(makeDirs.stderr, 3000)}`;
    await writeFailure(message);
    throw new Error(message);
  }

  const fetchMain = await exec('git', ['fetch', 'origin', 'main']);
  const fetchBranch = await exec('git', ['fetch', 'origin', branch]);
  if (fetchMain.code !== 0 || fetchBranch.code !== 0) {
    const message = [
      'Could not fetch quality-gate refs.',
      `main fetch stdout: ${compact(fetchMain.stdout, 1500)}`,
      `main fetch stderr: ${compact(fetchMain.stderr, 2500)}`,
      `branch fetch stdout: ${compact(fetchBranch.stdout, 1500)}`,
      `branch fetch stderr: ${compact(fetchBranch.stderr, 2500)}`,
    ].join('\n');
    await writeFailure(message);
    throw new Error(message);
  }

  const mainSha = await exec('git', ['rev-parse', 'origin/main^{commit}']);
  const branchSha = await exec('git', ['rev-parse', 'HEAD^{commit}']);
  if (mainSha.code !== 0 || branchSha.code !== 0) {
    const message = [
      'Could not resolve quality-gate commits.',
      `main: ${compact(mainSha.stderr || mainSha.stdout, 2000)}`,
      `builder HEAD: ${compact(branchSha.stderr || branchSha.stdout, 2000)}`,
    ].join('\n');
    await writeFailure(message);
    throw new Error(message);
  }

  const mainCommit = mainSha.stdout.trim();
  const branchCommit = branchSha.stdout.trim();

  const archiveMain = await exec('sh', ['-lc', `git archive --format=tar '${mainCommit}' | tar -xf - -C '${mainDir}'`]);
  const archiveBranch = await exec('sh', ['-lc', `git archive --format=tar '${branchCommit}' | tar -xf - -C '${branchDir}'`]);
  if (archiveMain.code !== 0 || archiveBranch.code !== 0) {
    const message = [
      'Could not materialize quality-gate trees.',
      `main archive stdout: ${compact(archiveMain.stdout, 1500)}`,
      `main archive stderr: ${compact(archiveMain.stderr, 2500)}`,
      `branch archive stdout: ${compact(archiveBranch.stdout, 1500)}`,
      `branch archive stderr: ${compact(archiveBranch.stderr, 2500)}`,
    ].join('\n');
    await writeFailure(message);
    throw new Error(message);
  }

  const changed = await exec('git', ['diff', '--no-index', '--name-only', '--', mainDir, branchDir]);
  const stat = await exec('git', ['diff', '--no-index', '--shortstat', '--', mainDir, branchDir]);
  if (!acceptableDiffExit(changed.code) || !acceptableDiffExit(stat.code)) {
    const message = [
      'Could not inspect builder diff.',
      `main commit: ${mainCommit}`,
      `builder commit: ${branchCommit}`,
      `changed exit: ${changed.code}`,
      `changed stdout: ${compact(changed.stdout, 3000)}`,
      `changed stderr: ${compact(changed.stderr, 3000)}`,
      `stat exit: ${stat.code}`,
      `stat stdout: ${compact(stat.stdout, 3000)}`,
      `stat stderr: ${compact(stat.stderr, 3000)}`,
    ].join('\n');
    await writeFailure(message);
    throw new Error(message);
  }

  const prefixes = [mainDir, branchDir];
  const paths = changed.stdout
    .split('\n')
    .map((x) => normalizePath(x, prefixes))
    .filter(Boolean);

  const match = stat.stdout.match(/(\d+) insertions?\(\+\).*?(\d+) deletions?\(-\)/);
  const insertions = Number(match?.[1] || 0);
  const deletions = Number(match?.[2] || 0);

  if (!highRisk(paths, insertions, deletions)) {
    await appendFile(reportPath, `# ${batchId} — Quality Gate\n\n**Result:** SKIPPED\n\nLow-risk diff; no additional Gemini review was spent.\n`);
    console.log('Quality review skipped: low-risk batch.');
    return;
  }

  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required for the conditional quality review.');

  let lessons = '';
  try { lessons = await readFile('builder/quality/lessons.md', 'utf8'); } catch { lessons = ''; }

  const prompt = [
    'BIKEZTAGRAM AI — CONDITIONAL QUALITY GATE',
    `BATCH: ${batchId}`,
    `BRANCH: ${branch}`,
    `MAIN COMMIT: ${mainCommit}`,
    `BUILDER COMMIT: ${branchCommit}`,
    'You are an independent, read-only production quality reviewer. Do not edit, commit, push, merge, or invent roadmap work.',
    'Inspect the checked-out repository and the committed-tree delta described below. Follow the real runtime path where the objective requires observable behaviour.',
    'A green build/test result is NOT sufficient. Reject superficial changes, prompt-only claims, unused contracts, dead code, placeholders, tests that do not prove the requested behaviour, and changes that do not reach the user-facing path.',
    'Approve only if the implementation materially satisfies the objective and preserves existing working behaviour.',
    `OBJECTIVE:\n${objective}`,
    `CHANGED FILES:\n- ${paths.join('\n- ')}`,
    `DIFF SIZE: ${insertions} insertions, ${deletions} deletions`,
    `DURABLE LESSONS:\n${lessons}`,
    'Return exactly these headings: ## Decision, ## Evidence, ## Gaps, ## Required fixes. Under ## Decision use exactly APPROVE or REJECT.',
  ].join('\n\n');

  const result = await exec('npx', ['--yes', `@google/gemini-cli@${cliVersion}`, '--skip-trust', '--approval-mode', 'plan', '--model', model, '--prompt', prompt]);
  const combined = `${result.stdout}\n${result.stderr}`;
  if (result.code !== 0) {
    if (/quota|resource_exhausted|429|rate limit|exhausted/i.test(combined)) throw new Error(`Conditional Gemini review hit quota/rate limiting. No retry.\n${compact(combined, 5000)}`);
    throw new Error(`Conditional Gemini review failed with exit ${result.code}.\n${compact(combined, 5000)}`);
  }

  const review = compact(result.stdout, 22000);
  await appendFile(reportPath, `# ${batchId} — Quality Gate\n\n${review}\n`);
  if (!/## Decision\s*\n\s*APPROVE\b/i.test(review)) throw new Error(`Gemini quality gate rejected the batch.\n${compact(review, 12000)}`);
  console.log('Conditional Gemini quality gate: APPROVE');
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
