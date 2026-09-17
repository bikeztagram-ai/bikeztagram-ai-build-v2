#!/usr/bin/env node
/**
 * Execute one registry-defined specialist Builder in an isolated worktree.
 * Specialist identity and ownership remain independent while execution is
 * delegated to the same proven long-run AutoBot controller used by the main
 * fleet. No second specialist engine is introduced.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { writeSpecialistHandoff } from './autobot-specialist-handoff.mjs';

const root = process.cwd();
const registryPath = path.join(root, 'builder/brain/autobot-fleet.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const botId = String(process.env.AUTOBOT_SPECIALIST_BOT_ID || '').trim();
const objectiveText = String(process.env.AUTOBOT_SPECIALIST_OBJECTIVE || '').trim();
const enabled = String(process.env.AUTOBOT_SPECIALIST_BUILDER_ENABLED || '').trim().toLowerCase() === 'true';
const outcomePath = process.env.AUTOBOT_SPECIALIST_OUTCOME_PATH || path.join(root, 'builder/working/autobot-specialist-outcome.json');
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
  if (!model) return 'ollama_chat/qwen2.5-coder:7b';
  return model.includes('/') ? model : `ollama_chat/${model}`;
}
function classifyFailure(error, hasPatch = false) {
  const message = String(error?.message || error || '');
  if (/no product change/i.test(message)) return { category: 'no-product-change', repairable: false };
  if (/ollama|proxy:\s*fetch failed|fetch failed|network|connection|timed out|timeout|cannot schedule new futures after shutdown|rate limit|503|502|504/i.test(message)) return { category: 'infrastructure', repairable: false };
  return { category: 'product-change', repairable: hasPatch };
}

/**
 * Capture the complete candidate state relative to the exact specialist base.
 * `git diff base` covers the working tree, including staged changes. The
 * explicit base..HEAD fallback also preserves a controller/Aider commit if a
 * tool ignored --no-auto-commits and advanced HEAD before failing.
 */
function captureBasePatch(base, worktree, files) {
  if (!worktree || !fs.existsSync(worktree) || !files.length) return '';
  try {
    const working = execFileSync('git', ['diff', '--binary', base, '--', ...files], { cwd: worktree, encoding: 'utf8' });
    const committed = execFileSync('git', ['diff', '--binary', `${base}..HEAD`, '--', ...files], { cwd: worktree, encoding: 'utf8' });
    if (working.trim()) return working;
    return committed;
  } catch (error) {
    console.error(`[autobot] could not capture specialist base diff: ${error.message}`);
    return '';
  }
}
function changedFromBase(base, worktree, files) {
  const paths = new Set();
  for (const args of [['diff', base, '--name-only', '--', ...files], ['diff', `${base}..HEAD`, '--name-only', '--', ...files]]) {
    try {
      for (const file of git(args, worktree).split(/\r?\n/).map(s => s.trim()).filter(Boolean)) paths.add(file);
    } catch {}
  }
  try {
    for (const file of git(['status', '--porcelain', '--untracked-files=all'], worktree).split(/\r?\n/).filter(Boolean).map(line => line.slice(3).trim()).filter(Boolean)) paths.add(file);
  } catch {}
  return [...paths];
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
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const acceptanceIndex = lines.findIndex(line => /^acceptance:?$/i.test(line));
  const title = lines[0] || `${bot.role} improvement`;
  const whyNow = acceptanceIndex > 1 ? lines[1] : '';
  const acceptance = acceptanceIndex >= 0 ? lines.slice(acceptanceIndex + 1) : [];
  return {
    id: `specialist-${botId}-${Date.now()}`, title, whyNow, enabled: true, dependsOn: [], files,
    acceptance: acceptance.length ? acceptance : [title],
    constraints: [
      `This is the ${bot.role} specialist lane. Preserve its declared product ownership.`,
      'Do not modify protected infrastructure, workflows, dependencies, secrets, or AutoBot control-plane code.',
      'Do not merge or push. Do not create pull requests.'
    ]
  };
}
function parseDurationMinutes(value, fallback = 15) {
  const duration = String(value || '').trim().toLowerCase();
  const match = duration.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/);
  if (!match) return fallback;
  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount) || amount < 1) return fallback;
  const unit = match[2] || 'm';
  return unit.startsWith('h') ? amount * 60 : amount;
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

const provenBrainPath = path.join(root, 'builder/runner/aider-feature-brain.mjs');
const provenBrain = fs.readFileSync(provenBrainPath, 'utf8');
for (const flag of ['--no-auto-commits', '--no-dirty-commits']) {
  if (!provenBrain.includes(`'${flag}'`)) fail(`Proven Aider brain lost required safety flag ${flag}.`);
}

const base = git(['rev-parse', 'HEAD'], root);
const worktree = fs.mkdtempSync(path.join(os.tmpdir(), `autobot-specialist-${botId}-`));
const branch = `autobot-specialist/${botId}-${Date.now()}`;
let keepBranch = false;
let candidatePatch = '';
try {
  run('git', ['worktree', 'add', '-b', branch, worktree, base], root);
  const assignmentPath = path.join(worktree, 'builder/working/autobot-orchestrator-assignment.json');
  const objective = parseObjective(objectiveText, bot, files);
  fs.mkdirSync(path.dirname(assignmentPath), { recursive: true });
  fs.writeFileSync(assignmentPath, JSON.stringify({ schemaVersion: 'autobot-orchestrator-assignment-v1', specialist: { id: botId, role: bot.role }, objective, source: 'parallel-specialist-workflow' }, null, 2) + '\n');

  run('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock'], worktree);

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
  // A one-hour specialist run must leave enough wall-clock budget for the
  // mandatory verification gates. One verified Aider pass is the useful unit
  // at short budgets; longer endurance runs can opt into two or three passes.
  const passCount = Number.isFinite(configuredPasses)
    ? Math.max(1, Math.min(3, configuredPasses))
    : requestedMinutes >= 120 ? 2 : 1;
  // Reserve time outside the proven controller for the mandatory build and
  // product-quality gates. The controller itself also has a controlled finish
  // grace, so reserve that grace separately rather than consuming the whole
  // verification reserve twice.
  const verificationReserveMinutes = requestedMinutes >= 60 ? 5 : requestedMinutes >= 30 ? 3 : Math.min(2, Math.max(1, requestedMinutes - 1));
  const controllerFinishGraceMinutes = Math.max(0, Number.parseInt(process.env.AUTOBOT_FINISH_GRACE_MINUTES || '5', 10));
  const controllerMinutes = Math.max(1, requestedMinutes - verificationReserveMinutes - controllerFinishGraceMinutes);
  const deadline = Date.now() + controllerMinutes * 60_000;
  const engineEnv = {
    ...process.env,
    AUTOBOT_SPECIALIST_MODE: 'true', AUTOBOT_FEATURE_ENGINE: 'aider', AUTOBOT_ORCHESTRATOR_ENABLED: 'true',
    AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH: assignmentPath, AUTOBOT_FEATURE_PROTOCOL: protocol,
    AUTOBOT_FEATURE_PASSES: String(passCount), AUTOBOT_FEATURE_DEADLINE_EPOCH_MS: String(deadline),
    AUTOBOT_FEATURE_NORMAL_DEADLINE_EPOCH_MS: String(deadline), AUTOBOT_AIDER_MODEL: model,
    AUTOBOT_FEATURE_SLICE_MINUTES: String(controllerMinutes),
    AUTOBOT_MAX_FEATURE_CYCLES: '1',
    AUTOBOT_AIDER_CALL_TIMEOUT_MS: String(Math.max(30_000, (controllerMinutes - 5) * 60_000)),
    LOCAL_AI_MODEL: process.env.LOCAL_AI_MODEL || model.replace(/^ollama_chat\//, ''),
    BUILDER_MAX_MINUTES: String(controllerMinutes),
    AUTOBOT_FINISH_GRACE_MINUTES: String(controllerFinishGraceMinutes)
  };

  console.log(`[autobot] specialist ${botId} entering the proven long-run controller: ${controllerMinutes}m controller budget + ${controllerFinishGraceMinutes}m controller grace (${verificationReserveMinutes}m reserved for verification), ${passCount} passes, ${model}, ${protocol}; feature slice=${controllerMinutes}m, Aider call reserve=5m, cycles=1`);
  const engine = spawnSync(process.execPath, ['builder/runner/long-run-executor.mjs'], {
    cwd: worktree, stdio: 'inherit', env: engineEnv,
    timeout: controllerMinutes * 60_000 + controllerFinishGraceMinutes * 60_000 + 30_000
  });
  if (engine.error || engine.status !== 0) fail(`proven long-run AutoBot controller failed with status ${engine.status ?? engine.error?.code ?? 'error'}`);

  const baseChanged = changedFromBase(base, worktree, files);
  const unauthorized = baseChanged.filter(file => !files.includes(file) && !file.startsWith('builder/working/'));
  if (unauthorized.length) fail(`Specialist Builder modified out-of-scope files: ${unauthorized.join(', ')}`);
  run('git', ['diff', base, '--check'], worktree);
  candidatePatch = captureBasePatch(base, worktree, files);
  const candidateFiles = baseChanged.filter(file => files.includes(file));
  if (!candidateFiles.length || !candidatePatch.trim()) fail('Specialist Builder produced no product change.');

  const productQuality = String(process.env.AUTOBOT_SPECIALIST_PRODUCT_QUALITY_CHECK || 'npm run verify:autobot-product-change-quality').trim();
  run('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock'], worktree);
  run('npm', ['run', 'build'], worktree);
  run('sh', ['-lc', productQuality], worktree);

  const headBeforeCommit = git(['rev-parse', 'HEAD'], worktree);
  if (headBeforeCommit !== base) run('git', ['reset', '--soft', base], worktree);
  run('git', ['add', '--', ...candidateFiles], worktree);
  const staged = git(['diff', '--cached', '--name-only'], worktree).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const stagedUnauthorized = staged.filter(file => !files.includes(file));
  if (stagedUnauthorized.length) fail(`Staged specialist diff escaped declared scope: ${stagedUnauthorized.join(', ')}`);
  if (!staged.length) fail('Specialist Builder produced no product change.');

  run('git', ['commit', '-m', `autobot(${botId}): ${objective.title.slice(0, 72)}`], worktree);
  const candidate = git(['rev-parse', 'HEAD'], worktree);
  const handoffPath = writeSpecialistHandoff({
    schemaVersion: 'autobot-specialist-handoff-v1', botId, objective: objectiveText,
    baseCommit: base, candidateCommit: candidate, branch, ownsFiles: staged,
    productQualityCheck: productQuality, status: 'verified-candidate',
    downstream: { reviewContract: 'AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT' }
  });
  fs.mkdirSync(path.dirname(outcomePath), { recursive: true });
  fs.writeFileSync(outcomePath, JSON.stringify({
    schemaVersion: 'autobot-specialist-outcome-v1', botId, objective: objectiveText,
    status: 'success', category: 'completed', repairable: false, files: staged,
    baseCommit: base, patchPath: null, evidence: [handoffPath],
    engine: 'proven-autobot-long-run-controller', featureEngine: 'builder/runner/aider-feature-brain.mjs',
    passes: passCount, protocol
  }, null, 2) + '\n');
  keepBranch = true;
  console.log(JSON.stringify({ ok: true, botId, baseCommit: base, candidateCommit: candidate, branch, files: staged, engine: 'proven-autobot-long-run-controller', featureEngine: 'builder/runner/aider-feature-brain', passes: passCount, protocol, handoffPath }));
} catch (error) {
  // IMPORTANT: capture the candidate before the finally block removes the
  // isolated worktree. This is what allows Specialist Recovery to receive the
  // real failed candidate rather than an empty failure record.
  writeFailureOutcome({ error, base, worktree, files, candidatePatch });
  throw error;
} finally {
  try { run('git', ['worktree', 'remove', '--force', worktree], root); } catch {}
  try { fs.rmSync(worktree, { recursive: true, force: true }); } catch {}
  if (!keepBranch) { try { run('git', ['branch', '-D', branch], root); } catch {} }
}
