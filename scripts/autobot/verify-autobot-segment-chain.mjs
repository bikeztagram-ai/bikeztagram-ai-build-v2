#!/usr/bin/env node
/** Contract for chained long-duration AutoBot execution. */
import fs from 'node:fs';
const root = process.cwd();
const read = p => fs.readFileSync(`${root}/${p}`, 'utf8');
const workflow = read('.github/workflows/autonomous-builder-v2.yml');
const continuation = read('.github/workflows/autonomous-builder-continuation.yml');
const longRun = read('builder/runner/long-run-executor.mjs');
const failures = [];
for (const [label, text, markers] of [
  ['primary workflow', workflow, ['segment-1', 'segment-2', 'REQUESTED_DURATION', 'BUILDER_MAX_MINUTES']],
  ['continuation workflow', continuation, ['workflow_dispatch', 'continuation_ref', 'remaining_minutes', 'BUILDER_MAX_MINUTES', 'gh workflow run']],
  ['long-run controller', longRun, ['long-run-state.json', 'writeRuntimeState', "appendAudit('run-finished'"]]
]) for (const marker of markers) if (!text.includes(marker)) failures.push(`${label} missing ${marker}`);
if (!/timeout-minutes:\s*370/.test(continuation)) failures.push('continuation job exceeds safe hosted-run ceiling');
if (!/cancel-in-progress:\s*false/.test(workflow)) failures.push('primary workflow may cancel active work');
if (!/cancel-in-progress:\s*false/.test(continuation)) failures.push('continuation workflow may cancel active work');
if (!/--ref \"\$CONTINUATION_REF\"/.test(continuation)) failures.push('continuation must run against the checkpoint ref');
if (!/REMAINING_MINUTES/.test(continuation) || !/budget.*360/s.test(continuation)) failures.push('continuation must cap each segment at six hours');
if (!/long-run-state\.json/.test(continuation)) failures.push('continuation must use authoritative long-run runtime state');
if (!/elapsedMinutes/.test(continuation) || !/remaining=\$\(\( REMAINING_MINUTES - used \)\)/.test(continuation)) failures.push('continuation must calculate remaining budget from long-run elapsed time');
if (!/gh workflow run autonomous-builder-continuation\.yml/.test(continuation)) failures.push('continuation recursion missing');
if (!/remaining != '0'/.test(continuation)) failures.push('continuation must stop when shared budget is exhausted');
if (!/--draft/.test(continuation)) failures.push('final continuation must publish a draft review PR');
if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot segment-chain contract PASS: current primary/continuation budget contract, six-hour segment ceiling, authoritative runtime budget, non-canceling execution, bounded recursion, and draft review boundary.');
