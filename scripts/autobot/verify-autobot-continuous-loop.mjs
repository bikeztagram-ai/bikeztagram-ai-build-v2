#!/usr/bin/env node
/** Regression contract for sustained AutoBot alternation and bounded slices. */
import fs from 'node:fs';
const root = process.cwd();
const read = p => fs.readFileSync(`${root}/${p}`, 'utf8');
const runner = read('builder/runner/long-run-executor.mjs');
const failures = [];
const required = [
  ['deterministic bounded slice', 'AUTOBOT_DETERMINISTIC_SLICE_MINUTES'],
  ['feature bounded slice', 'AUTOBOT_FEATURE_SLICE_MINUTES'],
  ['feature cycle ceiling', 'AUTOBOT_MAX_FEATURE_CYCLES'],
  ['deterministic execution', 'runOnce(deterministicSlice'],
  ['feature execution', 'runFeatureBrain()'],
  ['shared remaining-time guard', 'remainingMinutes()'],
  ['iteration audit', "appendAudit('iteration-started'"],
  ['feature audit', "appendAudit('feature-brain-started'"],
  ['final audit', 'verifyAuditLog()']
];
for (const [label, marker] of required) if (!runner.includes(marker)) failures.push(`missing ${label}: ${marker}`);
// A feature failure must not terminate the sustained controller. Detect only an
// immediate terminal exit in the feature-status branch; do not use a broad
// regex that can accidentally span later, unrelated break statements.
if (/const featureStatus=runFeatureBrain\(\);\s*if\(featureStatus!==0\)\{[^}]*process\.exit\(/s.test(runner)) failures.push('feature brain is terminal instead of resumable');
if (!/while\(totalUnits<requestedUnits&&remainingMinutes\(\)>0\)/.test(runner)) failures.push('no sustained shared-budget loop');
if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot continuous-loop contract PASS: bounded deterministic slices, bounded feature slices, repeated alternation, shared time budget, cycle ceiling, resumable feature failures, and audit evidence.');
