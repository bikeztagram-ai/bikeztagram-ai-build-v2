import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const entries = Object.entries(pkg.scripts)
  .filter(([name]) => /^verify:(?:batch\d+(?:runtime|audio)?|cinematic-|director-|executable-|subject-aware-|timeline-)/.test(name))
  .map(([name, command]) => ({ name, command }))
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

const failures = [];
for (const { name, command } of entries) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) failures.push(name);
}

console.log(`\nVerification audit complete: ${entries.length} checks run, ${failures.length} failed.`);
if (failures.length) {
  console.error(`Failed checks: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('MAIN SUITE: PASS');
