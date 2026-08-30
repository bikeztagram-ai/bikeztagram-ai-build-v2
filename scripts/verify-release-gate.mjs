import { spawnSync } from 'node:child_process';

const steps = [
  ['release-hardening', 'npm run verify:release-hardening'],
  ['main-suite', 'npm run verify:main-suite'],
  ['director-selection', 'npm run verify:batch48'],
  ['director-creative-contract', 'npm run verify:batch60'],
  ['renderer-media-guard', 'npm run verify:batch62'],
  ['app-pipeline-contract', 'npm run verify:batch67'],
  ['social-export', 'npm run verify:batch33'],
  ['social-output-contract', 'npm run verify:batch43'],
  ['end-to-end-contract', 'npm run verify:batch45'],
];

const failures = [];
for (const [name, command] of steps) {
  console.log(`\n=== RELEASE GATE: ${name} ===`);
  const result = spawnSync(command, { shell: true, stdio: 'inherit', env: process.env });
  if (result.status !== 0) failures.push(name);
}

console.log(`\nRelease gate complete: ${steps.length} checks, ${failures.length} failed.`);
if (failures.length) {
  console.error(`Failed release checks: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('RELEASE GATE: PASS');
