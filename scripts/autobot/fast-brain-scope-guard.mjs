#!/usr/bin/env node
/** Runtime guard for additive Qwen edits: inserted blocks must parse on their own. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
let brain = fs.readFileSync(brainPath, 'utf8');

if (!brain.includes('function insertBefore(file, anchor, addition, objective)') || !brain.includes('function insertAfter(file, anchor, addition, objective)')) {
  throw new Error('additive edit functions are missing; refusing scope-guard migration');
}

if (!brain.includes('function validateStandaloneBlock(file, addition)')) {
  const point = '\nfunction insertBefore(file, anchor, addition, objective) {';
  const helper = `
function validateStandaloneBlock(file, addition) {
  const ext = path.extname(String(file || '')).toLowerCase();
  const tempExt = ['.jsx', '.tsx', '.ts', '.mjs', '.cjs', '.js'].includes(ext) ? ext : '.js';
  const temp = path.join(os.tmpdir(), 'autobot-added-block-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(16).slice(2) + tempExt);
  try {
    fs.writeFileSync(temp, String(addition || ''));
    const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');
    if (fs.existsSync(esbuild)) {
      const args = [temp, '--log-level=error', '--outfile=' + temp + '.out'];
      if (tempExt === '.jsx') args.push('--loader:.jsx=jsx');
      if (tempExt === '.tsx') args.push('--loader:.tsx=tsx');
      execFileSync(esbuild, args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
      return 'PASS';
    }
    if (tempExt === '.ts' || tempExt === '.tsx') return 'FAIL TypeScript additive blocks require esbuild validation.';
    execFileSync(process.execPath, ['--check', temp], { cwd: root, encoding: 'utf8', stdio: 'pipe', timeout: 15000 });
    return 'PASS';
  } catch (error) {
    return 'FAIL standalone additive block is not a complete top-level program: ' + [error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(0, 2200);
  } finally {
    try { fs.rmSync(temp, { force: true }); } catch {}
    try { fs.rmSync(temp + '.out', { force: true }); } catch {}
  }
}
`;
  if (!brain.includes(point)) throw new Error('insertBefore anchor not found; refusing scope-guard migration');
  brain = brain.replace(point, helper + point);
}

const beforeNeedle = "if (!anchor || typeof addition !== 'string' || !addition.trim()) return 'ERROR: insert_before requires a non-empty anchor and code to insert.';";
const beforeGuard = beforeNeedle + "\n  const blockCheck = validateStandaloneBlock(file, addition);\n  if (blockCheck !== 'PASS') return 'ERROR: insert_before rejected before write; ' + blockCheck + ' Keep returns inside a declared function and submit a complete top-level block.';";
if (!brain.includes('const blockCheck = validateStandaloneBlock(file, addition);')) {
  if (brain.split(beforeNeedle).length - 1 !== 1) throw new Error('insert_before validation point is not unique; refusing migration');
  brain = brain.replace(beforeNeedle, beforeGuard);
}

const afterNeedle = "if (!anchor || typeof addition !== 'string' || !addition.trim()) return 'ERROR: insert_after requires a non-empty anchor and code to insert.';";
const afterGuard = afterNeedle + "\n  const blockCheck = validateStandaloneBlock(file, addition);\n  if (blockCheck !== 'PASS') return 'ERROR: insert_after rejected before write; ' + blockCheck + ' Keep returns inside a declared function and submit a complete top-level block.';";
if (brain.split(afterNeedle).length - 1 === 1 && brain.split(afterGuard).length - 1 === 0) {
  brain = brain.replace(afterNeedle, afterGuard);
} else if (!brain.includes(afterGuard)) {
  throw new Error('insert_after validation point is not recognized; refusing migration');
}

const oldPrompt = 'For a new top-level helper prefer mode=insert_before with a short unique declaration anchor; use insert_after only for a complete top-level statement; use replace only for a small complete syntactic unit. Never invent an enclosing function body.';
const newPrompt = 'For a new top-level helper prefer mode=insert_before with a short unique declaration anchor; use insert_after only for a complete top-level statement; use replace only for a small complete syntactic unit. Never invent an enclosing function body. In insert modes, the added block must parse as a standalone top-level program: every return must be inside a function, and never paste a statement into the middle of another function body.';
if (brain.includes(oldPrompt)) brain = brain.replace(oldPrompt, newPrompt);
else if (!brain.includes(newPrompt)) throw new Error('execution prompt marker not found; refusing scope-guard migration');

for (const marker of [
  'function validateStandaloneBlock(file, addition)',
  'const blockCheck = validateStandaloneBlock(file, addition);',
  'every return must be inside a function',
  'never paste a statement into the middle of another function body',
]) if (!brain.includes(marker)) throw new Error('scope-guard marker missing: ' + marker);

fs.writeFileSync(brainPath, brain);
try {
  execFileSync(process.execPath, ['--check', brainPath], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
  throw new Error('scope-guard produced invalid canonical brain: ' + [error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(0, 3000));
}
console.log('[autobot] Qwen scope guard PASS: additive blocks are standalone-syntax validated before write, return-scope guidance is explicit, and canonical brain syntax remains valid.');
