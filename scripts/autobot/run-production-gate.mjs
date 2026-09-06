#!/usr/bin/env node
/**
 * One authoritative AutoBot acceptance gate.
 * The autonomous worker may change product code, but a checkpoint is only
 * considered verified when the production build and critical contracts pass.
 */
import { spawnSync } from 'node:child_process';

const steps = [
  ['build', 'npm', ['run', 'build']],
  ['generation-contract', 'npm', ['run', 'verify:generation-capability-contract']],
  ['executable-timeline', 'npm', ['run', 'verify:executable-timeline']],
  ['director-handoff', 'npm', ['run', 'verify:director-timeline-handoff']],
  ['cinematic-quality', 'npm', ['run', 'verify:cinematic-quality-gate']],
  ['render-acceptance', 'npm', ['run', 'verify:render-acceptance-quality-gate']],
  ['music-arrangement-quality', 'npm', ['run', 'verify:music-arrangement-quality']],
  ['universal-production', 'npm', ['run', 'verify:universal-production-contract']],
  ['autobot-safety', 'npm', ['run', 'verify:autobot-safety']],
  ['autobot-dependencies', 'npm', ['run', 'verify:autobot-dependencies']],
  ['audit-tamper', 'npm', ['run', 'verify:autobot-audit-tamper']],
];

for (const [name, command, args] of steps) {
  console.log(`[autobot-gate] START ${name}`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) {
    console.error(`[autobot-gate] FAIL ${name}: status=${result.status ?? 'spawn-error'}`);
    process.exit(result.status || 1);
  }
  console.log(`[autobot-gate] PASS ${name}`);
}

console.log(`[autobot-gate] PASS: ${steps.length} production acceptance checks verified.`);
