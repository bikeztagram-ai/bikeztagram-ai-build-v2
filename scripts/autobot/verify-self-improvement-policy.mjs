#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const analysisPath = path.join(root, 'scripts/autobot/self-improvement-analysis-runtime.mjs');
const policyPath = path.join(root, 'scripts/autobot/self-improvement-policy-runtime.mjs');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'builder/brain/priority-policy.json'), 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(fs.readFileSync(analysisPath, 'utf8').includes('high-no-op-rate'), 'analysis must detect high no-op rate');
assert(fs.readFileSync(analysisPath, 'utf8').includes('premature-run-completion'), 'analysis must detect premature completion');
assert(fs.readFileSync(policyPath, 'utf8').includes('Math.min(3'), 'policy adjustments must have an upper bound');
assert(fs.readFileSync(policyPath, 'utf8').includes('Math.max(0.25'), 'policy adjustments must have a lower bound');
assert(policy.maxAdjustment === 1, 'policy maxAdjustment contract changed unexpectedly');
for (const [kind, weight] of Object.entries(policy.objectiveWeights || {})) {
  assert(Number.isFinite(weight) && weight >= 0.25 && weight <= 3, `weight out of bounds for ${kind}`);
}
console.log('[autobot] self-improvement policy contracts passed.');
