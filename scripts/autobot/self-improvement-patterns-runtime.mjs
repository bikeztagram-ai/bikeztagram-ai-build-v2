#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const file = path.join(root, 'builder', 'brain', 'autobot-learning.json');
const learning = JSON.parse(fs.readFileSync(file, 'utf8'));
const tasks = Object.values(learning.tasks || {});
const repeatedUnchanged = tasks.filter(t => t.unchanged >= 2).map(t => t.objectiveId);
const recommendations = learning.recommendations || [];
if (repeatedUnchanged.length) recommendations.push({ type: 'production-integration', evidence: [...new Set(repeatedUnchanged)], action: 'Require explicit production-path evidence for future variants.' });
learning.recommendations = recommendations.slice(-20);
learning.updatedAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(learning, null, 2) + '\n');
console.log(`[autobot] failure-pattern learner: ${repeatedUnchanged.length} repeated-unchanged objective patterns found.`);
