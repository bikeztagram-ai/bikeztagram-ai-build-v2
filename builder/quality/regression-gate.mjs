#!/usr/bin/env node
/** Run the repository verification suite and fail closed on regressions. */
import { execFileSync } from 'node:child_process';

const commands = (process.env.BUILDER_REGRESSION_COMMANDS || 'npm run build').split(',').map(s => s.trim()).filter(Boolean);
const results = [];
for (const command of commands) {
  const [bin, ...args] = command.split(/\s+/);
  const startedAt = Date.now();
  try {
    execFileSync(bin, args, { stdio: 'inherit', timeout: Number(process.env.BUILDER_REGRESSION_TIMEOUT_MS || 300000) });
    results.push({ command, status: 'passed', durationMs: Date.now() - startedAt });
  } catch (error) {
    results.push({ command, status: 'failed', durationMs: Date.now() - startedAt, exitCode: error.status ?? null });
    console.error(`Regression gate failed: ${command}`);
    process.exitCode = 2;
    break;
  }
}
console.log(JSON.stringify({ status: results.every(r => r.status === 'passed') ? 'passed' : 'failed', results, generatedAt: new Date().toISOString() }, null, 2));
