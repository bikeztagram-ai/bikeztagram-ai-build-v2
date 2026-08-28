#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const working = path.join(root, 'builder', 'working');
const brain = path.join(root, 'builder', 'brain');
const read = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const evidence = read(path.join(working, 'deterministic-autobot-evidence.json')) || { units: [] };
const checkpoint = read(path.join(working, 'deterministic-autobot.json')) || {};
const units = Array.isArray(evidence.units) ? evidence.units : [];
const failures = units.filter(unit => unit.error).map(unit => String(unit.error));
const noOps = units.filter(unit => unit.unchangedButVerified).length;
const changed = units.filter(unit => unit.unchangedButVerified === false).length;
const elapsedMinutes = Math.max(0, (Date.now() - Date.parse(evidence.startedAt || new Date().toISOString())) / 60000);
const signatures = [];
for (const error of failures) {
  if (/ReferenceError|SyntaxError|is not defined/.test(error)) signatures.push('generated-code-reference-safety');
  if (/timeout|timed out/i.test(error)) signatures.push('bounded-timeout-handling');
  if (/already satisfied|no new verified/i.test(error)) signatures.push('no-op-progress-detection');
}
const total = units.length;
const changedRatio = total ? changed / total : 0;
const noOpRatio = total ? noOps / total : 0;
if (checkpoint.status === 'idle') signatures.push('backlog-exhaustion');
if (total === 0 && checkpoint.status !== 'running') signatures.push('empty-run-evidence');
if (total > 0 && changed === 0) signatures.push('verification-without-production-change');
if (total >= 2 && noOpRatio >= 0.5) signatures.push('high-no-op-rate');
if (total > 0 && changedRatio < 0.25 && noOps > 0) signatures.push('low-production-yield');
if (elapsedMinutes < 0.5 && total > 0) signatures.push('premature-run-completion');
const failureKinds = [...new Set(failures.map(error => {
  if (/ReferenceError|SyntaxError|is not defined/.test(error)) return 'generated-code';
  if (/timeout|timed out/i.test(error)) return 'timeout';
  if (/quota|rate limit|429/i.test(error)) return 'quota';
  return 'other';
}))];
const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  sourceRunId: process.env.GITHUB_RUN_ID || 'local',
  objectiveId: evidence.objectiveId || checkpoint.objectiveId || null,
  metrics: {
    units: total,
    changedUnits: changed,
    noOpUnits: noOps,
    failures: failures.length,
    elapsedMinutes: Number(elapsedMinutes.toFixed(3)),
    changedRatio: Number(changedRatio.toFixed(3)),
    noOpRatio: Number(noOpRatio.toFixed(3)),
    failureKinds
  },
  failureSignatures: [...new Set(signatures)],
  recommendations: [...new Set([
    'Keep protected runner/workflow paths outside product-task scope.',
    'Prefer substantive production changes over marker-only verification.',
    failures.some(error => /ReferenceError|SyntaxError|is not defined/.test(error)) ? 'Add generated-code syntax/reference validation before execution.' : null,
    noOps > changed ? 'Increase task selection quality so already-satisfied units are deprioritised.' : null,
    checkpoint.status === 'idle' ? 'Maintain an executable self-improvement backlog when product objectives are exhausted.' : null,
    changed === 0 && total > 0 ? 'Do not treat a verification-only run as productive implementation.' : null,
    noOpRatio >= 0.5 && total > 0 ? 'Penalise task families producing repeated no-op verification and prefer unfinished production work.' : null,
    elapsedMinutes < 0.5 && total > 0 ? 'Investigate premature completion when a run ends unusually quickly despite available execution budget.' : null,
    failures.length >= 2 ? 'Cluster repeated failures by category before selecting the next remediation objective.' : null
  ].filter(Boolean))]
};
fs.mkdirSync(brain, { recursive: true });
fs.writeFileSync(path.join(brain, 'self-improvement-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`[autobot] self-improvement analysis: ${total} units, ${changed} changed, ${noOps} no-op, ${failures.length} failures, ${signatures.length} signatures.`);
