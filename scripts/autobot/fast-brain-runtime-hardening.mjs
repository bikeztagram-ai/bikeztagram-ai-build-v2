#!/usr/bin/env node
/**
 * Runtime compatibility guard for the canonical local-Qwen feature brain.
 *
 * The feature brain is now the source of truth. This script must never perform
 * blind source rewrites; it validates the active recovery contract and repairs
 * only the known generated task-library migration.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const taskPath = path.join(root, 'builder/brain/task-library.json');
const brain = fs.readFileSync(brainPath, 'utf8');

const requiredBrainMarkers = [
  'edit rejected and rolled back',
  'fs.writeFileSync(abs(file), current);',
  'completed: completedIds',
  'progress[objective.id] = 1',
  'failedEditFiles',
  'same file is blocked for this attempt',
  'A previous edit failed. Do not retry that file.',
  'Do NOT repeat the same replacement',
];

const missing = requiredBrainMarkers.filter((marker) => !brain.includes(marker));
if (missing.length) {
  throw new Error(`canonical feature brain recovery contract incomplete: ${missing.join(', ')}`);
}

// The generated task library may contain one historical export command. Repair
// that deterministic migration only; never rewrite feature-brain source here.
let tasks = fs.readFileSync(taskPath, 'utf8');
if (tasks.includes('npm run verify:batch33')) {
  tasks = tasks.replaceAll('npm run verify:batch33', 'node scripts/autobot/export-contract-check.mjs');
  fs.writeFileSync(taskPath, tasks);
  console.log('[autobot] stale export verification command repaired.');
}

const finalTasks = fs.readFileSync(taskPath, 'utf8');
if (finalTasks.includes('npm run verify:batch33')) {
  throw new Error('stale export verification command remains after migration');
}
if (!finalTasks.includes('export-contract-check.mjs')) {
  throw new Error('live export contract check is missing after migration');
}

console.log('[autobot] Qwen runtime hardening PASS: canonical source already contains transactional rollback, durable completion, objective rotation, failed-file steering, and the live export contract migration.');
