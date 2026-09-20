#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  ['release-hardening', 'npm run verify:release-hardening'],
  ['main-suite', 'npm run verify:main-suite'],
  ['director-selection-quality', 'npm run verify:director-selection-quality'],
  ['director-render-handoff-integrity', 'npm run verify:director-render-handoff-integrity'],
  ['director-runtime-contract', 'npm run verify:director-runtime-contract'],
  ['executable-timeline', 'npm run verify:executable-timeline'],
  ['director-timeline-handoff', 'npm run verify:director-timeline-handoff'],
  ['cinematic-quality-gate', 'npm run verify:cinematic-quality-gate'],
  ['render-acceptance-quality-gate', 'npm run verify:render-acceptance-quality-gate'],
  ['music-quality-v4', 'npm run verify:music-quality-v4'],
  ['universal-production-contract', 'npm run verify:universal-production-contract'],
  ['creative-capabilities', 'npm run verify:creative-capabilities'],
  ['generation-capability-contract', 'npm run verify:generation-capability-contract'],
];

const failures = [];
for (const [name, command] of steps) {
  console.log(`\n=== RELEASE GATE: ${name} ===`);
  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) failures.push(name);
}

console.log(`\nRelease gate complete: ${steps.length} checks, ${failures.length} failed.`);
if (failures.length) {
  console.error(`Failed release checks: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('RELEASE GATE: PASS');
