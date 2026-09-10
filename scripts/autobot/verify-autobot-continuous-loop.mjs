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
  ['shared remaining-time guard', 'remainingMs()'],
  ['absolute run deadline', 'const runDeadline=started+requestedMinutes*60_000'],
  ['deadline propagation', 'AUTOBOT_RUN_DEADLINE_EPOCH_MS'],
  ['iteration audit', "appendAudit('iteration-started'"],
  ['feature audit', "appendAudit('feature-brain-started'"],
  ['final audit', 'verifyAuditLog()'],
  ['self-evolution mode', 'selfImprovementOnly'],
  ['self-evolution focus propagation', 'AUTOBOT_FEATURE_FOCUS']
];
for (const [label, marker] of required) if (!runner.includes(marker)) failures.push(`missing ${label}: ${marker}`);
if (/const featureStatus=runFeatureBrain\(\);\s*if\(featureStatus!==0\)\{[^}]*process\.exit\(/s.test(runner)) failures.push('feature brain is terminal instead of resumable');
const productLoop=/while\(totalUnits<requestedUnits&&remainingMs\(\)>0\)/.test(runner);
const lockedLoop=/while\(\(selfImprovementOnly\?featureCycles<maxFeatureCycles:totalUnits<requestedUnits\)&&remainingMs\(\)>0\)/.test(runner);
if (!productLoop && !lockedLoop) failures.push('no sustained shared-budget loop');
if (!runner.includes("if(selfImprovementOnly){const featureStatus=runFeatureBrain()")) failures.push('locked self-evolution path is missing');
if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot continuous-loop contract PASS: bounded slices, shared absolute time budget, deadline propagation, cycle ceiling, resumable feature failures, locked self-evolution path, and audit evidence.');
