import { execFileSync } from 'node:child_process';

const checks = [
  ['creative-readiness', 'scripts/verify-creative-pretest-manifest.mjs'],
  ['candidate-readiness', 'scripts/verify-pretest-candidate.mjs'],
];

for (const [name, script] of checks) {
  execFileSync(process.execPath, [script], { stdio: 'inherit' });
  console.log(`${name}: PASS`);
}

console.log('pretest-suite: PASS');
