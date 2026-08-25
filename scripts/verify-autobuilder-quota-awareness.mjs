import { readFile } from 'node:fs/promises';

const runner = await readFile(new URL('../builder/runner/index.mjs', import.meta.url), 'utf8');

const required = [
  ['free-tier input-token detection', 'generate_content_free_tier_input_token_count'],
  ['quota stop flag', 'quotaDetected'],
  ['retry hint extraction', 'quotaRetryHint'],
  ['post-quota verification', 'const quotaVerification = await runVerification(sandbox);'],
  ['quota-preserving status', "status = 'PAUSED_FOR_QUOTA'"],
  ['quota branch publication', 'commitSha = await commitAndPublish(sandbox, gitEnv, BATCH_ID);'],
  ['no repeated quota loop', 'stopping the autonomous retry loop immediately'],
];

const missing = required.filter(([, marker]) => !runner.includes(marker));
if (missing.length) {
  console.error('Missing quota-awareness controls:');
  for (const [label] of missing) console.error(`- ${label}`);
  process.exit(1);
}

if (!/if \(isQuotaFailure\(agent\)\)/.test(runner)) {
  console.error('Quota detection must run before normal agent-exit handling.');
  process.exit(1);
}

console.log(`Autonomous builder quota-awareness verification passed (${required.length} controls).`);
