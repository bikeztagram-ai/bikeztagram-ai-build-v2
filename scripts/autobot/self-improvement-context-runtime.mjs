#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const learningPath = path.join(root, 'builder', 'brain', 'autobot-learning.json');
const memoryPath = path.join(root, 'builder', 'quality', 'project-memory.md');
const lessonsPath = path.join(root, 'builder', 'quality', 'lessons.md');
const learning = JSON.parse(fs.readFileSync(learningPath, 'utf8'));
learning.projectContext = {
  memoryLength: fs.readFileSync(memoryPath, 'utf8').length,
  lessonsLength: fs.readFileSync(lessonsPath, 'utf8').length,
  refreshedAt: new Date().toISOString(),
  rule: 'Use durable project memory and lessons as authoritative context; do not invent capabilities or weaken protected systems.'
};
fs.writeFileSync(learningPath, JSON.stringify(learning, null, 2) + '\n');
console.log('[autobot] project-context learner: durable context snapshot refreshed.');
