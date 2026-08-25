import { spawn } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';

const batchId = process.env.BUILDER_BATCH_ID || 'unknown-batch';
const objective = process.env.BUILDER_OBJECTIVE || '';
const acceptance = (process.env.BUILDER_ACCEPTANCE || '').split(';').map((x) => x.trim()).filter(Boolean);
const model = process.env.BUILDER_GEMINI_MODEL || 'flash-lite';
const lessonsPath = 'builder/quality/lessons.md';
const outputPath = `builder/working/${batchId}-architect-brief.md`;

function runGemini(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', [
      '--yes',
      '@google/gemini-cli@0.55.1',
      '--skip-trust',
      '--approval-mode',
      'plan',
      '--model',
      model,
      '--prompt',
      prompt,
    ], { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function compact(value, limit = 18000) {
  const text = String(value || '').trim();
  return text.length <= limit ? text : `${text.slice(0, limit)}\n...[truncated]`;
}

async function main() {
  if (!objective) throw new Error('BUILDER_OBJECTIVE is required');
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required for the bounded architecture review');

  let lessons = '';
  try { lessons = await readFile(lessonsPath, 'utf8'); } catch { lessons = 'No durable lessons file was available.'; }

  const prompt = [
    'BIKEZTAGRAM AI — BOUNDED ARCHITECTURE/QUALITY ADVISOR',
    `BATCH: ${batchId}`,
    '',
    'You are the architecture and quality advisor for an autonomous production-code builder.',
    'This is exactly ONE bounded advisory pass. Do not implement changes. Do not edit files. Do not commit or push anything.',
    'Inspect only the relevant existing repository code needed to understand the objective and integration path.',
    'Your job is to turn the supplied batch objective into an implementation-ready engineering brief that prevents the builder from satisfying the task with superficial tests, schemas, placeholders, or isolated code.',
    'Explicitly identify the real user-facing/runtime path that must work, existing contracts that must be preserved, likely integration traps, and concrete verification evidence that should exist before the batch is considered good.',
    'Do not invent unrelated roadmap features. Keep the brief tightly scoped to this batch.',
    'If the objective is already strong, sharpen it rather than expanding it.',
    '',
    `CURRENT OBJECTIVE:\n${objective}`,
    '',
    `CURRENT ACCEPTANCE CRITERIA:\n- ${acceptance.join('\n- ')}`,
    '',
    `DURABLE QUALITY LESSONS:\n${lessons}`,
    '',
    'Return only a concise markdown engineering brief with these headings:',
    '## Implementation target',
    '## Runtime/integration path',
    '## Required implementation details',
    '## Verification evidence',
    '## Failure conditions',
  ].join('\n');

  const result = await runGemini(prompt);
  const combined = `${result.stdout}\n${result.stderr}`;
  if (result.code !== 0) {
    if (/quota|resource_exhausted|429|rate limit|exhausted/i.test(combined)) {
      throw new Error(`Gemini architecture pass hit quota/rate limiting. No repeated retry will be attempted.\n${compact(combined, 5000)}`);
    }
    throw new Error(`Gemini architecture pass failed with exit ${result.code}.\n${compact(combined, 5000)}`);
  }

  const brief = compact(result.stdout, 22000);
  if (!brief || brief.length < 100) throw new Error('Gemini architecture pass returned no useful brief.');

  await appendFile(outputPath, `# ${batchId} — Architecture Brief\n\n${brief}\n`);

  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    const delimiter = `BIKEZTAGRAM_ARCH_${Date.now()}`;
    await appendFile(envFile, `BUILDER_OBJECTIVE<<${delimiter}\n${objective}\n\nARCHITECT QUALITY BRIEF:\n${brief}\n${delimiter}\n`);
  }

  console.log(`Architecture brief created at ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
