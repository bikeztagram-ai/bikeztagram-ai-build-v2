#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const brain = path.join(root, 'builder', 'brain');
const reportPath = path.join(brain, 'self-improvement-report.json');
const policyPath = path.join(brain, 'priority-policy.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
let policy = { schemaVersion: 2, objectiveWeights: {}, maxAdjustment: 1, updatedAt: null };
try { policy = JSON.parse(fs.readFileSync(policyPath, 'utf8')); } catch {}
const weights = { ...(policy.objectiveWeights || {}) };
const bump = (key, amount) => { weights[key] = Math.min(3, Math.max(0.25, (weights[key] || 1) + amount)); };
const reduce = (key, amount) => { weights[key] = Math.min(3, Math.max(0.25, (weights[key] || 1) - amount)); };
for (const signature of report.failureSignatures || []) {
  if (signature === 'no-op-progress-detection') bump('production-hardening', 0.25);
  if (signature === 'generated-code-reference-safety') bump('production-implementation', 0.25);
  if (signature === 'backlog-exhaustion') bump('self-improvement', 0.5);
  if (signature === 'verification-without-production-change') bump('production-enhancement', 0.25);
  if (signature === 'high-no-op-rate') { reduce('builder-analysis', 0.25); bump('production-enhancement', 0.25); }
  if (signature === 'low-production-yield') { reduce('builder-analysis', 0.25); bump('production-implementation', 0.25); }
  if (signature === 'premature-run-completion') bump('self-improvement', 0.25);
  if (signature === 'bounded-timeout-handling') bump('production-hardening', 0.25);
}
policy = {
  schemaVersion: 2,
  objectiveWeights: weights,
  maxAdjustment: 1,
  updatedAt: new Date().toISOString(),
  sourceRunId: report.sourceRunId,
  sourceSignatures: report.failureSignatures || [],
  sourceMetrics: report.metrics || {}
};
fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2) + '\n');
fs.writeFileSync(path.join(brain, 'self-improvement-ledger.json'), JSON.stringify({
  schemaVersion: 2,
  updatedAt: new Date().toISOString(),
  lastReport: report,
  appliedPolicy: policy
}, null, 2) + '\n');
console.log('[autobot] bounded self-improvement policy updated from measured run evidence; adjustments are capped and auditable.');
