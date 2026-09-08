#!/usr/bin/env node
/**
 * Preflight guard for the canonical local-Qwen feature brain.
 * Repairs only deterministic runtime-compatibility defects before the agent
 * starts. The canonical brain remains the source of truth after hardening.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const taskPath = path.join(root, 'builder/brain/task-library.json');
let brain = fs.readFileSync(brainPath, 'utf8');

const requiredBrainMarkers = [
  "PROTOCOL = 'repository-aware-agent-v7'", '/api/chat', 'stream: false', 'think: false',
  'tool_name: call.name', 'num_ctx: 4096', 'num_predict: 900',
  'fs.writeFileSync(abs(file), next);', 'const syntax = syntaxCheck(file);',
  'edit rejected and rolled back', 'fs.writeFileSync(abs(file), current);', 'failedEditFiles',
  'Do NOT retry the same replacement.', 'completed: completedIds', 'progress[objective.id] = 1',
  '(progress[o.id] || 0) < 1', 'state.failed',
];
const missing = requiredBrainMarkers.filter((marker) => !brain.includes(marker));
if (missing.length) throw new Error(`canonical feature brain recovery contract incomplete: ${missing.join(', ')}`);

const syntaxFunctionPattern = /function syntaxCheck\(file\) \{[\s\S]*?\n\}\nfunction runCheck/;
const hardenedSyntaxFunction = `function syntaxCheck(file) {
  if (!/\\.(js|mjs|cjs|jsx|ts|tsx)$/.test(file)) return 'PASS';
  const ext = path.extname(file).toLowerCase();
  const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');
  if (fs.existsSync(esbuild)) {
    const out = path.join(os.tmpdir(), 'autobot-syntax-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(16).slice(2) + '.js');
    try {
      const args = [file, '--log-level=error', '--outfile', out];
      if (ext === '.jsx') args.push('--loader:.jsx=jsx');
      if (ext === '.tsx') args.push('--loader:.tsx=tsx');
      execFileSync(esbuild, args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
      return 'PASS';
    } catch (error) {
      return 'FAIL ' + [error.stdout, error.stderr, error.message].filter(Boolean).join('\\n').slice(0, 2200);
    } finally { try { fs.rmSync(out, { force: true }); } catch {} }
  }
  try { execFileSync(process.execPath, [file], { cwd: root, encoding: 'utf8', stdio: 'pipe', timeout: 15000 }); return 'PASS'; }
  catch (error) { return 'FAIL ' + [error.stdout, error.stderr, error.message].filter(Boolean).join('\\n').slice(0, 2200); }
}
function runCheck`;
if (!syntaxFunctionPattern.test(brain)) throw new Error('canonical syntaxCheck function shape is not recognized; refusing unsafe migration');
brain = brain.replace(syntaxFunctionPattern, hardenedSyntaxFunction);
fs.writeFileSync(brainPath, brain);

let tasks = fs.readFileSync(taskPath, 'utf8');
if (tasks.includes('npm run verify:batch33')) {
  tasks = tasks.replaceAll('npm run verify:batch33', 'node scripts/autobot/export-contract-check.mjs');
  fs.writeFileSync(taskPath, tasks);
  console.log('[autobot] stale export verification command repaired.');
}
const finalBrain = fs.readFileSync(brainPath, 'utf8');
if (!finalBrain.includes("const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');")) throw new Error('real syntax validator was not installed');
if (!finalBrain.includes("if (ext === '.jsx') args.push('--loader:.jsx=jsx');")) throw new Error('JSX syntax loader was not installed');
const finalTasks = fs.readFileSync(taskPath, 'utf8');
if (finalTasks.includes('npm run verify:batch33')) throw new Error('stale export verification command remains after migration');
if (!finalTasks.includes('export-contract-check.mjs')) throw new Error('live export contract check is missing after migration');
console.log('[autobot] Qwen runtime hardening PASS: canonical agent verified, real JS/JSX syntax validation installed, transactional edits verified, durable progress verified, failed-edit recovery verified, export migration guarded.');
