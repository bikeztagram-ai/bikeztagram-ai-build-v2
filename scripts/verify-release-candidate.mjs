import { spawnSync } from 'node:child_process';

const checks = [
  'verify:batch47','verify:batch48','verify:batch49','verify:batch50','verify:batch51','verify:batch52','verify:batch53','verify:batch54','verify:batch55','verify:batch56',
  'verify:batch57runtime','verify:batch57','verify:batch58audio','verify:batch58','verify:batch59','verify:batch60','verify:batch61','verify:batch62','verify:batch63','verify:batch64','verify:batch65','verify:batch66','verify:batch67','verify:batch68','verify:batch69','verify:batch70','verify:batch71','verify:batch72'
];

for (const check of checks) {
  console.log(`\n=== ${check} ===`);
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', check], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\nRELEASE CANDIDATE FAILED: ${check}`);
    process.exit(result.status || 1);
  }
}
console.log('\nRELEASE CANDIDATE VERIFICATION: PASS');
