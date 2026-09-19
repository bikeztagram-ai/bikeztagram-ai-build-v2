#!/usr/bin/env node
/**
 * Execute one registry-defined specialist Builder in an isolated worktree.
 * Specialist identity and ownership remain independent while execution is
 * delegated to the proven long-run AutoBot controller and Aider feature brain.
 * If Aider cannot materialize an owned product change, the older proven
 * structured search/replace brain gets a bounded second chance.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { writeSpecialistHandoff } from './autobot-specialist-handoff.mjs';

const root = process.cwd();
const registry = JSON.parse(fs.readFileSync(path.join(root, 'builder/brain/autobot-fleet.json'), 'utf8'));
const botId = String(process.env.AUTOBOT_SPECIALIST_BOT_ID || '').trim();
const objectiveText = String(process.env.AUTOBOT_SPECIALIST_OBJECTIVE || '').trim();
const enabled = String(process.env.AUTOBOT_SPECIALIST_BUILDER_ENABLED || '').trim().toLowerCase() === 'true';
const outcomePath = process.env.AUTOBOT_SPECIALIST_OUTCOME_PATH || path.join(root, 'builder/working/autobot-specialist-outcome.json');
const handoffPath = process.env.AUTOBOT_SPECIALIST_HANDOFF_PATH || path.join(root, 'builder/working/autobot-specialist-handoff.json');
const failurePatchPath = process.env.AUTOBOT_SPECIALIST_FAILURE_PATCH_PATH || path.join(root, 'builder/working/autobot-specialist-failure.patch');

function fail(message) { throw new Error(message); }
function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env, ...options });
  if (result.error || result.status !== 0) fail(`${command} ${args.join(' ')} failed with status ${result.status ?? 'error'}`);
  return result;
}
function git(args, cwd) { return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim(); }
function safeRelative(file) {
  const value = String(file || '').trim();
  return value && !path.isAbsolute(value) && !value.includes('..') && !value.startsWith('.') && !value.includes('\\') ? value : null;
}
function normalizeAiderModel(value) {
  const model = String(value || '').trim();
  return model ? (model.includes('/') ? model : `ollama_chat/${model}`) : 'ollama_chat/qwen2.5-coder:7b';
}
function parseDurationMinutes(value, fallback = 15) {
  const match = String(value || '').trim().toLowerCase().match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/);
  if (!match) return fallback;
  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount) || amount < 1) return fallback;
  return String(match[2] || 'm').startsWith('h') ? amount * 60 : amount;
}
function classifyFailure(error, hasPatch) {
  const message = String(error?.message || error || '');
  if (/no product change/i.test(message)) return { category: 'no-product-change', repairable: false };
  if (/ollama|proxy:\s*fetch failed|fetch failed|network|connection|timed out|timeout|cannot schedule new futures after shutdown|rate limit|503|502|504/i.test(message)) return { category: 'infrastructure', repairable: false };
  return { category: 'product-change', repairable: Boolean(hasPatch) };
}
function splitGitPaths(output) { return String(output || '').split('\0').map(x => x.trim()).filter(Boolean); }
function changedFromBase(base, worktree) {
  const paths = new Set();
  for (const args of [['diff', '--name-only', '-z', base], ['diff', '--name-only', '-z', `${base}..HEAD`], ['ls-files', '--others', '--exclude-standard', '-z']]) {
    try { for (const file of splitGitPaths(execFileSync('git', args, { cwd: worktree, encoding: 'utf8' }))) paths.add(file); } catch {}
  }
  return [...paths];
}
function captureBasePatch(base, worktree, files) {
  if (!files.length) return '';
  try {
    const working = execFileSync('git', ['diff', '--binary', base, '--', ...files], { cwd: worktree, encoding: 'utf8' });
    if (working.trim()) return working;
    return execFileSync('git', ['diff', '--binary', `${base}..HEAD`, '--', ...files], { cwd: worktree, encoding: 'utf8' });
  } catch { return ''; }
}
function ownedProductFiles(base, worktree, files) {
  return changedFromBase(base, worktree).filter(file => files.includes(file));
}
function runStructuredFallback(worktree, assignmentPath, model, base) {
  run('git', ['reset', '--hard', base], worktree);
  const fallbackModel = String(process.env.AUTOBOT_SPECIALIST_FALLBACK_MODEL || 'qwen2.5-coder:3b').trim();
  const fallbackMinutes = Math.max(1, Number.parseInt(process.env.AUTOBOT_SPECIALIST_FALLBACK_MINUTES || '5', 10));
  const env = {
    ...process.env,
    LOCAL_AI_READY: '1',
    LOCAL_AI_MODEL: fallbackModel.replace(/^ollama_chat\//, ''),
    OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    AUTOBOT_ORCHESTRATOR_ENABLED: 'true',
    AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH: assignmentPath,
    AUTOBOT_SPECIALIST_BASE_COMMIT: base,
    AUTOBOT_FEATURE_ENGINE: 'structured',
    AUTOBOT_FEATURE_PROTOCOL: 'structured-search-replace-v3',
    AUTOBOT_FEATURE_PASSES: '1',
    AUTOBOT_FEATURE_MAX_ATTEMPTS: process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || '2',
    AUTOBOT_FEATURE_MAX_EDITS: process.env.AUTOBOT_FEATURE_MAX_EDITS || '2',
    BUILDER_MAX_MINUTES: String(fallbackMinutes),
    LOCAL_AI_FEATURE_TIMEOUT_SECONDS: String(Math.max(90, Math.min(210, fallbackMinutes * 60 - 20)))
  };
  console.log(`[autobot] Aider produced no owned product change; invoking proven structured fallback for ${fallbackMinutes}m with ${fallbackModel}`);
  const result = spawnSync(process.execPath, ['builder/runner/autobot-specialist-structured-fallback.mjs'], {
    cwd: worktree,
    stdio: 'inherit',
    env,
    timeout: fallbackMinutes * 60_000 + 30_000
  });
  if (result.error || result.status !== 0) return result.error ? 1 : (result.status ?? 1);
  return 0;
}
function writeFailureOutcome({ error, base, worktree, files, candidatePatch = '' }) {
  const patch = candidatePatch || captureBasePatch(base, worktree, files);
  let patchPath = null;
  if (patch.trim()) {
    fs.mkdirSync(path.dirname(failurePatchPath), { recursive: true });
    fs.writeFileSync(failurePatchPath, patch);
    patchPath = failurePatchPath;
  }
  const classification = classifyFailure(error, Boolean(patchPath));
  fs.mkdirSync(path.dirname(outcomePath), { recursive: true });
  fs.writeFileSync(outcomePath, JSON.stringify({
    schemaVersion: 'autobot-specialist-outcome-v1', botId, objective: objectiveText,
    status: 'failure', category: classification.category, repairable: classification.repairable,
    files, baseCommit: base || null, patchPath,
    evidence: ['GitHub Actions specialist execution logs', patchPath].filter(Boolean),
    error: String(error?.message || error || 'unknown specialist failure')
  }, null, 2) + '\n');
}
function parseObjective(text, bot, files) {
  const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const acceptanceIndex = lines.findIndex(x => /^acceptance:?$/i.test(x));
  return {
    id: `specialist-${botId}-${Date.now()}`, title: lines[0] || `${bot.role} improvement`, whyNow: acceptanceIndex > 1 ? lines[1] : '', enabled: true,
    dependsOn: [], files, acceptance: acceptanceIndex >= 0 ? lines.slice(acceptanceIndex + 1) : [lines[0] || 'Improve the assigned product area'],
    constraints: [`This is the ${bot.role} specialist lane. Preserve its declared product ownership.`, 'Do not modify protected infrastructure, workflows, dependencies, secrets, or AutoBot control-plane code.', 'Do not merge or push. Do not create pull requests.']
  };
}

if (!enabled) fail('Specialist Builder execution is disabled until the fleet activation gate is explicitly enabled.');
if (registry.enabled !== true || registry.coordination?.mode !== 'active') fail('AutoBot fleet activation is blocked; registry must be enabled with active coordination.');
const bot = registry.bots.find(item => item.id === botId);
if (!bot) fail(`Unknown specialist Builder id: ${botId}`);
if (!bot.specialistBuilder) fail(`Registry bot ${botId} is not marked specialistBuilder.`);
if (bot.protected === true) fail('Specialist Builder cannot be protected infrastructure.');
if (bot.status !== 'verified') fail(`Specialist Builder ${botId} is not verified.`);
if (bot.entrypoint !== 'builder/runner/autobot-specialist-builder.mjs') fail('Registry specialist Builder entrypoint does not match the executable.');
if (!objectiveText) fail('AUTOBOT_SPECIALIST_OBJECTIVE is required.');

const files = Array.isArray(bot.ownsFiles) ? bot.ownsFiles.map(safeRelative).filter(Boolean) : [];
if (!files.length) fail(`Specialist Builder ${botId} has no declared ownsFiles scope.`);
const provenBrain = fs.readFileSync(path.join(root, 'builder/runner/aider-feature-brain.mjs'), 'utf8');
for (const flag of ['--no-auto-commits', '--no-dirty-commits']) if (!provenBrain.includes(`'${flag}'`)) fail(`Proven Aider brain lost required safety flag ${flag}.`);

const base = git(['rev-parse', 'HEAD'], root);
const worktree = fs.mkdtempSync(path.join(os.tmpdir(), `autobot-specialist-${botId}-`));
const branch = `autobot-specialist/${botId}-${Date.now()}`;
let keepBranch = false;
let candidatePatch = '';
try {
  run('git', ['worktree', 'add', '-b', branch, worktree, base], root);
  const skipNpmInstall = String(process.env.AUTOBOT_SKIP_NPM_INSTALL || '').toLowerCase() === 'true';
  if (skipNpmInstall) {
    const modules = path.join(root, 'node_modules');
    if (!fs.existsSync(modules)) fail('AUTOBOT_SKIP_NPM_INSTALL requested but root node_modules is missing.');
    fs.symlinkSync(modules, path.join(worktree, 'node_modules'), 'dir');
  } else {
    run('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock'], worktree);
  }
  const assignmentPath = path.join(worktree, 'builder/working/autobot-orchestrator-assignment.json');
  const objective = parseObjective(objectiveText, bot, files);
  fs.mkdirSync(path.dirname(assignmentPath), { recursive: true });
  fs.writeFileSync(assignmentPath, JSON.stringify({ schemaVersion: 'autobot-orchestrator-assignment-v1', specialist: { id: botId, role: bot.role }, objective, source: 'parallel-specialist-workflow' }, null, 2) + '\n');

  let requestedMinutes = Math.max(1, Number.parseInt(process.env.BUILDER_MAX_MINUTES || '', 10));
  if (!Number.isFinite(requestedMinutes)) {
    try {
      const eventPath = process.env.GITHUB_EVENT_PATH;
      const event = eventPath && fs.existsSync(eventPath) ? JSON.parse(fs.readFileSync(eventPath, 'utf8')) : {};
      requestedMinutes = parseDurationMinutes(event.inputs?.duration, 15);
    } catch { requestedMinutes = 15; }
  }
  const model = normalizeAiderModel(process.env.AUTOBOT_AIDER_MODEL || process.env.LOCAL_AI_MODEL);
  const protocol = String(process.env.AUTOBOT_FEATURE_PROTOCOL || 'aider-repo-map-v4').trim();
  const configuredPasses = Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES || '', 10);
  const passCount = Number.isFinite(configuredPasses) ? Math.max(1, Math.min(3, configuredPasses)) : requestedMinutes >= 120 ? 2 : 1;
  const verificationReserveMinutes = requestedMinutes >= 60 ? 5 : requestedMinutes >= 30 ? 3 : Math.min(2, Math.max(1, requestedMinutes - 1));
  const fallbackReserveMinutes = Math.min(6, Math.max(4, requestedMinutes >= 30 ? 6 : 5));
  const controllerFinishGraceMinutes = Math.max(0, Number.parseInt(process.env.AUTOBOT_FINISH_GRACE_MINUTES || '5', 10));
  const controllerMinutes = Math.max(1, requestedMinutes - verificationReserveMinutes - fallbackReserveMinutes - controllerFinishGraceMinutes);
  const deadline = Date.now() + controllerMinutes * 60_000;
  const engineEnv = {
    ...process.env,
    AUTOBOT_SPECIALIST_MODE: 'true', AUTOBOT_FEATURE_ENGINE: 'aider', AUTOBOT_ORCHESTRATOR_ENABLED: 'true',
    AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH: assignmentPath, AUTOBOT_FEATURE_PROTOCOL: protocol,
    AUTOBOT_FEATURE_PASSES: String(passCount), AUTOBOT_FEATURE_DEADLINE_EPOCH_MS: String(deadline),
    AUTOBOT_FEATURE_NORMAL_DEADLINE_EPOCH_MS: String(deadline), AUTOBOT_AIDER_MODEL: model,
    AUTOBOT_FEATURE_SLICE_MINUTES: String(controllerMinutes), AUTOBOT_MAX_FEATURE_CYCLES: '1',
    LOCAL_AI_MODEL: process.env.LOCAL_AI_MODEL || model.replace(/^ollama_chat\//, ''),
    BUILDER_MAX_MINUTES: String(controllerMinutes), AUTOBOT_FINISH_GRACE_MINUTES: String(controllerFinishGraceMinutes)
  };
  console.log(`[autobot] specialist ${botId} entering Aider-first controller: ${controllerMinutes}m Aider budget + ${fallbackReserveMinutes}m structured fallback + ${verificationReserveMinutes}m verification + ${controllerFinishGraceMinutes}m grace (${model}, ${protocol})`);
  const engine = spawnSync(process.execPath, ['builder/runner/long-run-executor.mjs'], { cwd: worktree, stdio: 'inherit', env: engineEnv, timeout: controllerMinutes * 60_000 + controllerFinishGraceMinutes * 60_000 + 30_000 });
  if (engine.error && !ownedProductFiles(base, worktree, files).length) console.warn(`[autobot] Aider controller ended with ${engine.error.message}; inspecting worktree before fallback`);
  if (engine.status !== 0 && engine.error && !ownedProductFiles(base, worktree, files).length) console.warn(`[autobot] Aider controller process status: ${engine.status ?? 'error'}`);

  let candidateFiles = ownedProductFiles(base, worktree, files);
  candidatePatch = captureBasePatch(base, worktree, files);
  if (!candidateFiles.length || !candidatePatch.trim()) {
    const fallbackStatus = runStructuredFallback(worktree, assignmentPath, model, base);
    candidateFiles = ownedProductFiles(base, worktree, files);
    candidatePatch = captureBasePatch(base, worktree, files);
    if (fallbackStatus !== 0 && (!candidateFiles.length || !candidatePatch.trim())) fail(`Specialist Builder produced no product change after Aider and structured fallback (fallback status ${fallbackStatus}).`);
  }

  const unauthorized = changedFromBase(base, worktree).filter(file => !files.includes(file) && !file.startsWith('builder/working/'));
  if (unauthorized.length) fail(`Specialist Builder modified out-of-scope files: ${unauthorized.join(', ')}`);
  run('git', ['diff', base, '--check'], worktree);
  const productQuality = String(process.env.AUTOBOT_SPECIALIST_PRODUCT_QUALITY_CHECK || 'npm run verify:autobot-product-change-quality').trim();
  if (!skipNpmInstall) run('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock'], worktree);
  run('npm', ['run', 'build'], worktree);
  run('sh', ['-lc', productQuality], worktree);
  const headBeforeCommit = git(['rev-parse', 'HEAD'], worktree);
  if (headBeforeCommit !== base) run('git', ['reset', '--soft', base], worktree);
  run('git', ['add', '--', ...candidateFiles], worktree);
  const staged = git(['diff', '--cached', '--name-only'], worktree).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const stagedUnauthorized = staged.filter(file => !files.includes(file));
  if (stagedUnauthorized.length) fail(`Staged specialist diff escaped declared scope: ${stagedUnauthorized.join(', ')}`);
  if (!staged.length) fail('Specialist Builder produced no product change.');
  run('git', ['commit', '-m', `autobot(${botId}): ${objective.title.slice(0, 72)}`], worktree);
  const candidate = git(['rev-parse', 'HEAD'], worktree);
  const handoffFile = writeSpecialistHandoff({ schemaVersion: 'autobot-specialist-handoff-v1', botId, objective: objectiveText, baseCommit: base, candidateCommit: candidate, branch, ownsFiles: staged, productQualityCheck: productQuality, status: 'verified-candidate', downstream: { reviewContract: 'AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT' } }, handoffPath);
  fs.mkdirSync(path.dirname(outcomePath), { recursive: true });
  fs.writeFileSync(outcomePath, JSON.stringify({ schemaVersion: 'autobot-specialist-outcome-v1', botId, objective: objectiveText, status: 'success', category: 'completed', repairable: false, files: staged, baseCommit: base, patchPath: null, evidence: [handoffFile], engine: 'aider-first-with-structured-fallback', featureEngine: 'builder/runner/aider-feature-brain.mjs', fallbackEngine: 'builder/runner/autobot-specialist-structured-fallback.mjs', passes: passCount, protocol }, null, 2) + '\n');
  keepBranch = true;
  console.log(JSON.stringify({ ok: true, botId, baseCommit: base, candidateCommit: candidate, branch, files: staged, engine: 'aider-first-with-structured-fallback', featureEngine: 'builder/runner/aider-feature-brain', fallbackEngine: 'builder/runner/autobot-specialist-structured-fallback', passes: passCount, protocol, handoffPath: handoffFile }));
} catch (error) {
  writeFailureOutcome({ error, base, worktree, files, candidatePatch });
  throw error;
} finally {
  try { run('git', ['worktree', 'remove', '--force', worktree], root); } catch {}
  try { fs.rmSync(worktree, { recursive: true, force: true }); } catch {}
  if (!keepBranch) { try { run('git', ['branch', '-D', branch], root); } catch {} }
}
