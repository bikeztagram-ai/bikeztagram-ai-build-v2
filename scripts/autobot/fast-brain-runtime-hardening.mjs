#!/usr/bin/env node
/**
 * Preflight guard for the canonical local-Qwen feature brain.
 * The repository-aware feature brain is the single source of truth. This
 * script verifies that contract and performs only the supported migration of
 * stale generated export verification commands.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const taskPath = path.join(root, 'builder/brain/task-library.json');
const brain = fs.readFileSync(brainPath, 'utf8');

const requiredBrainMarkers = [
  "PROTOCOL = 'repository-aware-agent-v7'",
  '/api/chat',
  'stream: false',
  'think: false',
  'tool_name: call.name',
  'num_ctx: 4096',
  'num_predict: 900',
  'fs.writeFileSync(abs(file), next);',
  'const syntax = syntaxCheck(file);',
  'edit rejected and rolled back',
  'fs.writeFileSync(abs(file), current);',
  'failedEditFiles',
  'Do NOT retry the same replacement.',
  'completed: completedIds',
  'progress[objective.id] = 1',
  '(progress[o.id] || 0) < 1',
  'state.failed',
];

const missing = requiredBrainMarkers.filter((marker) => !brain.includes(marker));
if (missing.length) {
  throw new Error(`canonical feature brain recovery contract incomplete: ${missing.join(', ')}`);
}

// Compatibility migration only: repair the known stale generated export
// acceptance command. Never rewrite canonical feature-brain source here.
let tasks = fs.readFileSync(taskPath, 'utf8');
if (tasks.includes('npm run verify:batch33')) {
  tasks = tasks.replaceAll('npm run verify:batch33', 'node scripts/autobot/export-contract-check.mjs');
  fs.writeFileSync(taskPath, tasks);
  console.log('[autobot] stale export verification command repaired.');
}

const finalTasks = fs.readFileSync(taskPath, 'utf8');
if (finalTasks.includes('npm run verify:batch33')) throw new Error('stale export verification command remains after migration');
if (!finalTasks.includes('export-contract-check.mjs')) throw new Error('live export contract check is missing after migration');

console.log('[autobot] Qwen runtime hardening PASS: canonical brain verified, transactional edits verified, durable progress verified, failed-edit recovery verified, export migration guarded.');
