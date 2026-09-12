import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const entries = Object.entries(pkg.scripts)
  .filter(([name]) => /^verify:batch\d+(?:runtime|audio)?$/.test(name))
  .map(([name, command]) => ({ name, command }))
  .filter(({ name }) => {
    const m = name.match(/^verify:batch(\d+)/);
    return Number(m[1]) >= 23;
  })
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

const failures = [];
for (const { name, command } of entries) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(command.replace(/^node\s+/, 'node ').trim(), {
    shell: true,
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) failures.push(name);
}

const autobotChecks = ['verify:autobot-live-telemetry', 'verify:autobot-brain-registry', 'verify:autobot-fleet-foundation'];
for (const name of autobotChecks) {
  const command = pkg.scripts[name];
  if (!command) {
    failures.push(name);
    continue;
  }
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(command.replace(/^node\s+/, 'node ').trim(), {
    shell: true,
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) failures.push(name);
}

console.log(`\nVerification audit complete: ${entries.length + autobotChecks.length} checks run, ${failures.length} failed.`);
if (failures.length) {
  console.error(`Failed checks: ${failures.join(', ')}`);
  process.exit(1);
}
