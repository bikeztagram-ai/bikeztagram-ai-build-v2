#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const run = (cmd, args = []) => {
  console.log(`\n[preflight] ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', env: process.env });
};

const workflow = fs.readFileSync('.github/workflows/autonomous-builder-v2.yml', 'utf8');
if (!workflow.includes("'15m'") || !workflow.includes("'12h'")) throw new Error('Duration selector is incomplete');
if (!workflow.includes('Gemini-free')) throw new Error('Wrong workflow selected');
if (!workflow.includes('BUILDER_MAX_MINUTES')) throw new Error('Duration budget is not wired');

run('node', ['builder/runner/run-duration.mjs']);
run('node', ['builder/runner/segment-plan.mjs']);
run('node', ['scripts/autobot/verify-deterministic-executor.mjs']);
run('node', ['builder/quality/autobot-ready.mjs']);
run('node', ['scripts/verify-batch77-director-duration-budget.mjs']);
run('node', ['scripts/verify-batch78-director-subject-diversity.mjs']);
run('npm', ['run', 'verify:project-memory']);
run('npm', ['run', 'build']);

console.log('\n[preflight] PASS — ready for the 15-minute live AutoBot test.');
