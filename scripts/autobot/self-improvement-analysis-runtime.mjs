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
const failures = units.filter(unit => unit.error).map(unit => unit.error);
const noOps = units.filter(unit => unit.unchangedButVerified).length;
const changed = units.filter(unit => unit.unchangedButVerified === false).length;
const elapsedMinutes = Math.max(0, (Date.now() - Date.parse(evidence.startedAt || new Date().toISOString())) / 60000);
const signatures = [];
for (const error of failures) {
  if (/ReferenceError|SyntaxError|is not defined/.test(error)) signatures.push('generated-code-reference-safety');
  if (/timeout|timed out/i.test(error)) signatures.push('bounded-timeout-handling');
  if (/already satisfied|no new verified/i.test(error)) signatures.push('no-op-progress-detection');
}
if (checkpoint.status === 'idle') signatures.push('backlog-exhaustion');
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceRunId: process.env.GITHUB_RUN_ID || 'local',
  objectiveId: evidence.objectiveId || checkpoint.objectiveId || null,
  metrics: { units: units.length, changedUnits: changed, noOpUnits: noOps, failures: failures.length, elapsedMinutes: Number(elapsedMinutes.toFixed(3)) },
  failureSignatures: [...new Set(signatures)],
  recommendations: [...new Set([
    'Keep protected runner/workflow paths outside product-task scope.',
    'Prefer substantive production changes over marker-only verification.',
    failures.some(error => /ReferenceError|SyntaxError|is not defined/.test(error)) ? 'Add generated-code syntax/reference validation before execution.' : null,
    noOps > changed ? 'Increase task selection quality so already-satisfied units are deprioritised.' : null,
    checkpoint.status === 'idle' ? 'Maintain an executable self-improvement backlog when product objectives are exhausted.' : null
  ].filter(Boolean))]
};
fs.mkdirSync(brain, { recursive: true });
fs.writeFileSync(path.join(brain, 'self-improvement-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`[autobot] self-improvement analysis: ${units.length} units, ${changed} changed, ${noOps} no-op, ${failures.length} failures.`);
