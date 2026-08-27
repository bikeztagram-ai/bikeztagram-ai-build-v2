#!/usr/bin/env node
/**
 * Fail early when a queued deterministic task references a missing worker.
 * A green queue must mean the selected work can actually execute.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queue = JSON.parse(fs.readFileSync(path.join(root, 'config', 'autonomous-builder-queue.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'builder', 'brain', 'task-library.json'), 'utf8'));
const batchId = process.env.BUILDER_BATCH_ID;
const batch = queue.batches.find(b => b.id === batchId);
if (!batch) throw new Error(`No queue batch found for ${batchId || '(unset)'}`);
const tasks = library.tasks.filter(t => t.objectiveId === batchId.replace(/^batch-/, ''));
const problems = [];
for (const task of tasks) {
  if (!Array.isArray(task.implementation) || task.implementation.length === 0) {
    problems.push(`${task.id}: no implementation commands`);
    continue;
  }
  for (const command of task.implementation) {
    const [executable, ...args] = command.trim().split(/\s+/);
    if (executable === 'node' && args[0] && !args[0].startsWith('-')) {
      const candidate = path.resolve(root, args[0]);
      if (!fs.existsSync(candidate)) problems.push(`${task.id}: missing worker ${args[0]}`);
    }
  }
}
const result = { batchId, taskCount: tasks.length, status: problems.length ? 'blocked' : 'ready', problems, checkedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
if (problems.length) process.exit(2);
