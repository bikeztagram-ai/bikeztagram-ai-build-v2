#!/usr/bin/env node
/** Regression contract for the active repository-aware AutoBot controller. */
import fs from 'node:fs';

const root = process.cwd();
const read = (p) => fs.readFileSync(`${root}/${p}`, 'utf8');
const executor = read('builder/runner/repository-aware-executor.mjs');
const brain = read('builder/runner/repository-aware-feature-brain.mjs');
const failures = [];

const requiredExecutor = [
  ['bounded deterministic slice', /Math\.min\(4/],
  ['bounded feature slice', /Math\.min\(10/],
  ['deterministic execution', /deterministic-executor\.mjs/],
  ['feature execution', /repository-aware-feature-brain\.mjs/],
  ['shared remaining-time guard', /left\(\)/],
  ['iteration loop', /while\s*\(left\(\)>1/],
  ['iteration audit', /repository-aware-run-started/],
  ['final audit', /verifyAuditLog\(\)/]
];
for (const [label, pattern] of requiredExecutor) if (!pattern.test(executor)) failures.push(`missing ${label}`);

const requiredBrain = [
  ['bounded feature passes', /maxFeatures/],
  ['bounded attempts', /maxAttempts/],
  ['bounded turns', /maxTurns/],
  ['bounded edits', /maxEdits/],
  ['objective selection', /function\s+choose\s*\(/],
  ['objective progress', /progress\[o\.id\]/],
  ['feature completion audit', /repository-aware-feature-complete/]
];
for (const [label, pattern] of requiredBrain) if (!pattern.test(brain)) failures.push(`missing ${label}`);

if (/git\s+reset\s+--hard|git\s+clean\s+-f/.test(executor + brain)) failures.push('unsafe wholesale recovery remains active');
if (!/AUTOBOT_FEATURE_PASSES_PER_SLICE/.test(executor)) failures.push('feature pass budget is not propagated');
if (!/AUTOBOT_FEATURE_MAX_ATTEMPTS/.test(brain) && !/maxAttempts/.test(brain)) failures.push('feature attempt ceiling missing');

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('AutoBot continuous-loop contract PASS: canonical repository-aware executor, bounded deterministic/feature slices, objective progress, bounded recovery, and audit evidence.');
