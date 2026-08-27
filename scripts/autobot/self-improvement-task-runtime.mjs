#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const file = path.join(root, 'builder', 'brain', 'autobot-learning.json');
const learning = JSON.parse(fs.readFileSync(file, 'utf8'));
const tasks = Object.entries(learning.tasks || {});
const weak = tasks.filter(([, value]) => value.unchanged >= 1 || value.verificationChecks === 0).map(([id]) => id);
learning.taskDesignRecommendations = [...new Set([...(learning.taskDesignRecommendations || []), ...weak.map(id => ({ taskId: id, action: 'Prefer explicit production integration and focused behavioural verification.' }))])].slice(-30);
learning.updatedAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(learning, null, 2) + '\n');
console.log(`[autobot] task-design learner: ${weak.length} task recipes flagged for review.`);
