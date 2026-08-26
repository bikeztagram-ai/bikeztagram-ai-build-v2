import { spawn } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';

const model = process.env.BUILDER_GEMINI_MODEL || 'flash-lite';
const branch = process.env.BUILDER_WORKING_BRANCH;
const batchId = process.env.BUILDER_BATCH_ID || 'unknown-batch';
const objective = process.env.BUILDER_OBJECTIVE || '';
const reportPath = `builder/working/${batchId}-quality-review.md`;

function exec(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let stdout = ''; let stderr = '';
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

async function main() {
  if (!branch) throw new Error('BUILDER_WORKING_BRANCH is required');
  if (!objective) throw new Error('BUILDER_OBJECTIVE is required');

  // The Actions checkout is intentionally shallow. A plain tree diff can fail
  // when the builder branch and origin/main do not have enough shared history
  // locally. Make the comparison deterministic by fetching the complete refs
  // before inspecting the diff. This is runner-only work and does not rerun
  // the builder or spend another Gemini architecture pass.
  const fetch = await exec('git', ['fetch', '--unshallow', 'origin', 'main', branch]);
  if (fetch.code !== 0) throw new Error(`Could not fetch builder branch history: ${fetch.stderr}`);

  const changed = await exec('git', ['diff', '--name-only', 'origin/main', 'HEAD']);
  const stat = await exec('git', ['diff', '--shortstat', 'origin/main', 'HEAD']);
  if (changed.code !== 0 || stat.code !== 0) {
    throw new Error(`Could not inspect builder diff.\nchanged: ${compact(changed.stderr, 2000)}\nstat: ${compact(stat.stderr, 2000)}`);
  }

  const paths = changed.stdout.split('\n').map((x) => x.trim()).filter(Boolean);
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
    'You are an independent, read-only production quality reviewer. Do not edit, commit, push, merge, or invent roadmap work.',
    'Inspect the git diff from origin/main to the builder branch and the relevant existing source files. Follow the real runtime path where the objective requires observable behaviour.',
    'A green build/test result is NOT sufficient. Reject superficial changes, prompt-only claims, unused contracts, dead code, placeholders, tests that do not prove the requested behaviour, and changes that do not reach the user-facing path.',
    'Approve only if the implementation materially satisfies the objective and preserves existing working behaviour.',
    `OBJECTIVE:\n${objective}`,
    `CHANGED FILES:\n- ${paths.join('\n- ')}`,
    `DIFF SIZE: ${insertions} insertions, ${deletions} deletions`,
    `DURABLE LESSONS:\n${lessons}`,
    'Return exactly these headings: ## Decision, ## Evidence, ## Gaps, ## Required fixes. Under ## Decision use exactly APPROVE or REJECT.',
  ].join('\n\n');

  const result = await exec('npx', ['--yes', '@google/gemini-cli@0.55.1', '--skip-trust', '--approval-mode', 'plan', '--model', model, '--prompt', prompt]);
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
