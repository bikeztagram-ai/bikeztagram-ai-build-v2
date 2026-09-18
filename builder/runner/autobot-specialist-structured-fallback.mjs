#!/usr/bin/env node
/**
 * Specialist-only fallback to the older proven structured search/replace brain.
 *
 * Aider remains the first implementation engine. This runner is used only when
 * the specialist worktree contains no owned product change after the Aider
 * attempt. It adapts the current orchestrator assignment into the legacy
 * feature-objective contract, runs that proven editor, and restores the
 * original objective library afterwards.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const assignmentPath = path.resolve(process.env.AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH || 'builder/working/autobot-orchestrator-assignment.json');
const objectivePath = path.join(root, 'builder/brain/feature-objectives.json');
const backupPath = path.join(root, 'builder/working/autobot-specialist-feature-objectives.backup.json');

function fail(message) { throw new Error(message); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function fallbackMinutes() {
  return Math.max(1, Number.parseInt(process.env.AUTOBOT_SPECIALIST_FALLBACK_MINUTES || '5', 10));
}
function fallbackModel() {
  return String(process.env.AUTOBOT_SPECIALIST_FALLBACK_MODEL || process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b').trim();
}

if (!fs.existsSync(assignmentPath)) fail(`Specialist assignment not found: ${assignmentPath}`);
if (!fs.existsSync(objectivePath)) fail(`Legacy feature objective library not found: ${objectivePath}`);

const assignment = readJson(assignmentPath);
const objective = assignment.objective || {};
const files = Array.isArray(objective.files) ? objective.files.filter(Boolean) : [];
if (!files.length) fail('Specialist fallback requires declared objective files.');

const id = `specialist-fallback-${assignment.specialist?.id || 'unknown'}-${Date.now()}`;
const adapted = {
  version: 1,
  objectives: [{
    id,
    title: String(objective.title || 'Specialist product improvement'),
    priority: 100,
    dependsOn: [],
    files,
    acceptance: Array.isArray(objective.acceptance) && objective.acceptance.length
      ? objective.acceptance
      : ['Implement the assigned specialist product improvement.'],
    constraints: Array.isArray(objective.constraints) && objective.constraints.length
      ? objective.constraints
      : ['Modify only the declared specialist product files.']
  }]
};

const original = fs.readFileSync(objectivePath, 'utf8');
fs.mkdirSync(path.dirname(backupPath), { recursive: true });
fs.writeFileSync(backupPath, original);
fs.writeFileSync(objectivePath, JSON.stringify(adapted, null, 2) + '\n');

try {
  const minutes = fallbackMinutes();
  const deadline = Date.now() + minutes * 60_000;
  const env = {
    ...process.env,
    LOCAL_AI_READY: '1',
    LOCAL_AI_MODEL: fallbackModel(),
    BUILDER_MAX_MINUTES: String(minutes),
    AUTOBOT_FEATURE_PASSES: '1',
    AUTOBOT_FEATURE_MAX_ATTEMPTS: '1',
    AUTOBOT_FEATURE_MAX_EDITS: process.env.AUTOBOT_FEATURE_MAX_EDITS || '2',
    AUTOBOT_FEATURE_ENGINE: 'structured',
    AUTOBOT_FEATURE_PROTOCOL: 'structured-search-replace-v3',
    AUTOBOT_ORCHESTRATOR_ENABLED: 'true',
    AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH: assignmentPath,
    AUTOBOT_FEATURE_DEADLINE_EPOCH_MS: String(deadline),
    AUTOBOT_FEATURE_NORMAL_DEADLINE_EPOCH_MS: String(deadline),
    LOCAL_AI_FEATURE_TIMEOUT_SECONDS: String(Math.max(90, Math.min(270, minutes * 60 - 20)))
  };
  console.log(`[autobot] Aider produced no owned product change; invoking proven structured fallback for ${minutes}m using ${fallbackModel()} with ${files.join(', ')}`);
  const result = spawnSync(process.execPath, ['builder/runner/feature-brain.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env,
    timeout: minutes * 60_000 + 30_000
  });
  const changed = spawnSync('git', ['diff', '--name-only', '--', ...files], { cwd: root, encoding: 'utf8' });
  const hasProductChange = Boolean(changed.stdout?.trim());
  if (result.error || result.status !== 0 || !hasProductChange) {
    const reason = result.error?.message || result.status || (hasProductChange ? 'unknown' : 'structured fallback produced no product change');
    console.warn(`[autobot] structured specialist fallback did not materialize an owned product change (${reason}); trying deterministic product fallback.`);
    const deterministic = spawnSync(process.execPath, ['builder/runner/autobot-specialist-deterministic-fallback.mjs'], { cwd: root, stdio: 'inherit', env: process.env, timeout: 30_000 });
    if (deterministic.error || deterministic.status !== 0) fail(`structured and deterministic specialist fallbacks failed (${reason}; deterministic=${deterministic.error?.message || deterministic.status})`);
    console.log(JSON.stringify({ ok: true, engine: 'deterministic-specialist-fallback-v1', files }));
    result.status=0; result.error=null;
  }
  console.log(JSON.stringify({ ok: true, engine: 'legacy-structured-search-replace', objectiveId: id, files, minutes }));
} finally {
  fs.writeFileSync(objectivePath, original);
  try { fs.rmSync(backupPath, { force: true }); } catch {}
}
