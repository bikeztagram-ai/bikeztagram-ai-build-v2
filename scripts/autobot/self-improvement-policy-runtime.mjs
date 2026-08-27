#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const brain = path.join(root, 'builder', 'brain');
const reportPath = path.join(brain, 'self-improvement-report.json');
const policyPath = path.join(brain, 'priority-policy.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
let policy = { schemaVersion: 1, objectiveWeights: {}, maxAdjustment: 1, updatedAt: null };
try { policy = JSON.parse(fs.readFileSync(policyPath, 'utf8')); } catch {}
const weights = { ...(policy.objectiveWeights || {}) };
for (const signature of report.failureSignatures || []) {
  if (signature === 'no-op-progress-detection') weights['production-hardening'] = Math.min(3, (weights['production-hardening'] || 1) + 0.25);
  if (signature === 'generated-code-reference-safety') weights['production-implementation'] = Math.min(3, (weights['production-implementation'] || 1) + 0.25);
  if (signature === 'backlog-exhaustion') weights['self-improvement'] = Math.min(3, (weights['self-improvement'] || 1) + 0.5);
}
policy = { schemaVersion: 1, objectiveWeights: weights, maxAdjustment: 1, updatedAt: new Date().toISOString(), sourceRunId: report.sourceRunId };
fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2) + '\n');
fs.writeFileSync(path.join(brain, 'self-improvement-ledger.json'), JSON.stringify({ schemaVersion: 1, updatedAt: new Date().toISOString(), lastReport: report, appliedPolicy: policy }, null, 2) + '\n');
console.log('[autobot] bounded self-improvement policy updated; adjustments are capped and auditable.');
