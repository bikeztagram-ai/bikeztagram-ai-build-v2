#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const file = path.join(root, 'builder', 'brain', 'autobot-learning.json');
const learning = JSON.parse(fs.readFileSync(file, 'utf8'));
const proposals = learning.qualityProposals || [];
const total = Number(learning.totals?.verified || 0);
const unchanged = Number(learning.totals?.unchanged || 0);
if (total > 0 && unchanged / total >= 0.25) proposals.push({ type: 'quality-gate', reason: 'A significant share of verified units produced no working-tree change.', action: 'Require production integration evidence before accepting similar tasks.' });
if (!proposals.length) proposals.push({ type: 'quality-gate', reason: 'No recurring shallow-completion signal yet.', action: 'Keep current verification gates and continue collecting evidence.' });
learning.qualityProposals = proposals.slice(-20);
learning.updatedAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(learning, null, 2) + '\n');
console.log(`[autobot] quality learner: ${learning.qualityProposals.length} bounded proposals recorded.`);
