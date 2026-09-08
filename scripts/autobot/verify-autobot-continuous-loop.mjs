#!/usr/bin/env node
/** Contract for the active Fast Brain sustained controller. */
import fs from 'node:fs';

const root = process.cwd();
const read = (p) => fs.readFileSync(`${root}/${p}`, 'utf8');
const runner = read('builder/runner/repository-aware-fast-executor.mjs');
const brain = read('builder/runner/repository-aware-feature-brain.mjs');
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');
const failures = [];
const required = [
  ['repository-aware Qwen feature execution', 'repository-aware-feature-brain.mjs'],
  ['deterministic execution', 'deterministic()'],
  ['Qwen execution', 'qwenAgent()'],
  ['shared remaining-time guard', 'left()'],
  ['repository index refresh', 'repository-index.mjs'],
  ['iteration audit', "appendAudit('repository-aware-fast-run-started'"],
  ['final audit', "appendAudit('repository-aware-fast-run-finished'"],
  ['audit verification', 'verifyAuditLog()'],
  ['feature success accounting', 'features += 1'],
  ['feature failure accounting', 'failures += 1'],
];
for (const [label, marker] of required) if (!runner.includes(marker)) failures.push(`missing ${label}: ${marker}`);

if (!/while\s*\(\s*left\(\)\s*>\s*1\s*&&\s*verified\s*<\s*units\s*\)/.test(runner)) {
  failures.push('no sustained shared-budget loop');
}
if (!/Math\.max\(1,\s*Math\.min\(4,\s*Math\.floor\(left\(\)\)\)\)/.test(runner)) {
  failures.push('deterministic slice is not bounded to four minutes');
}
if (!/Math\.max\(1,\s*Math\.min\(10,\s*Math\.floor\(left\(\)\)\)\)/.test(runner)) {
  failures.push('Qwen feature slice is not bounded to ten minutes');
}
if (!/if\s*\(f\s*===\s*0\)\s*features\s*\+=\s*1/.test(runner)) failures.push('Qwen feature failures/successes are not explicitly accounted for');
if (/if\s*\(\s*f\s*!==\s*0\s*\)\s*process\.exit\s*\(/.test(runner)) failures.push('feature failure is terminal instead of resumable');
if (!/if\s*\(\s*d\s*!==\s*0\s*&&\s*f\s*!==\s*0\s*\)\s*break/.test(runner)) failures.push('controller lacks bounded stop condition after both execution paths fail');

for (const [pattern, message] of [
  [/repository-aware-agent-v7/, 'canonical Qwen agent protocol missing'],
  [/state\.failed/, 'durable failure state missing'],
  [/failedEditFiles/, 'failed-file recovery missing'],
  [/fs\.writeFileSync\(abs\(file\), current\);/, 'transactional rollback missing'],
  [/progress\[objective\.id\]\s*=\s*(?:Math\.max|1)/, 'durable objective completion missing'],
]) if (!pattern.test(brain)) failures.push(message);

if (!workflow.includes('repository-aware-fast-executor.mjs')) failures.push('workflow does not invoke canonical fast executor');
if (!workflow.includes('verify-fast-brain-live-qwen-smoke.mjs')) failures.push('workflow lacks live Qwen preflight');
if (workflow.includes('long-run-executor.mjs')) failures.push('Fast Brain workflow still invokes retired long-run executor');

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('AutoBot continuous-loop contract PASS: canonical Qwen/deterministic alternation, shared time budget, bounded slices, resumable feature failures, index refresh, honest accounting and audit evidence.');
