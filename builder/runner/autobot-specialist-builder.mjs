#!/usr/bin/env node
/**
 * Execute one registry-defined specialist Builder in an isolated worktree.
 * Specialist identity and ownership remain independent while execution is
 * delegated to the proven long-run AutoBot controller and Aider feature brain.
 * If Aider cannot materialize an owned product change, the older proven
 * structured search/replace brain gets a bounded second chance; if that fallback
 * produces a candidate rejected by the product-quality guard, the deterministic
 * specialist fallback gets the final bounded recovery attempt.
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
const editStrategy = String(process.env.AUTOBOT_SPECIALIST_EDIT_STRATEGY || 'adaptive').trim().toLowerCase();
const coordinationId = String(process.env.AUTOBOT_COORDINATION_ID || '').trim();
const enabled = String(process.env.AUTOBOT_SPECIALIST_BUILDER_ENABLED || '').trim().toLowerCase() === 'true';
const outcomePath = process.env.AUTOBOT_SPECIALIST_OUTCOME_PATH || path.join(root, 'builder/working/autobot-specialist-outcome.json');
const handoffPath = process.env.AUTOBOT_SPECIALIST_HANDOFF_PATH || path.join(root, 'builder/working/autobot-specialist-handoff.json');
const failurePatchPath = process.env.AUTOBOT_SPECIALIST_FAILURE_PATCH_PATH || path.join(root, 'builder/working/autobot-specialist-failure.patch');
const learningPath = path.join(root, 'builder/brain/autobot-specialist-learning.json');
let learningProfile = { default: { mapTokens: 768, editFormat: 'udiff', targetingMode: 'symbol-first', maxTargetSymbols: 6 }, bots: {}, failureStrategies: {} };
try { learningProfile = JSON.parse(fs.readFileSync(learningPath, 'utf8')); } catch {}
const botLearning = () => ({ ...(learningProfile.default || {}), ...(learningProfile.bots?.[botId] || {}) });
function buildTargetMap(files, objective) {
  const maxSymbols = Math.max(1, Number(learningProfile.default?.maxTargetSymbols || 6));
  const keywords = String(objective || '').toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g) || [];
  const out = [];
  for (const file of files) {
    try {
      const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        const trimmed=line.trim();
        if (/^(?:export\s+)?(?:async\s+)?function\s+|^(?:export\s+)?class\s+|^(?:export\s+)?const\s+[A-Za-z_$][\w$]*\s*=/.test(trimmed)) {
          const lower=trimmed.toLowerCase();
          const context=lines.slice(Math.max(0,index-3),Math.min(lines.length,index+4)).join('\n');
          const contextLower=context.toLowerCase();
          const score=keywords.reduce((n,k)=>n+(lower.includes(k)?3:0)+(contextLower.includes(k)?1:0),0);
          out.push({ file, line:index+1, score, declaration:trimmed.slice(0,180), context:context.slice(0,1400) });
        }
      });
    } catch {}
  }
  return out.sort((a,b)=>b.score-a.score||a.line-b.line).slice(0,maxSymbols);
}
let aiderOutputTail = '';
let candidateOrigin = 'none';
let aiderAttempted = false;
let aiderMaterialized = false;

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
  if (model.startsWith('ollama/')) return `ollama_chat/${model.slice('ollama/'.length)}`;
  if (model.startsWith('ollama_chat/')) return model;
  return model.includes('/') ? model : `ollama_chat/${model}`;
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
function normalizeNestedSrcDuplicate(worktree, files) {
  // Aider can emit src/<file> while running from src/, creating src/src/<file>.
  // Salvage only this exact duplicate-prefix case; never rewrite arbitrary paths.
  for (const file of files) {
    if (!file.startsWith('src/')) continue;
    const nested = path.join(worktree, 'src', file);
    const canonical = path.join(worktree, file);
    if (!fs.existsSync(nested) || !fs.existsSync(canonical)) continue;
    const nestedText = fs.readFileSync(nested, 'utf8');
    const canonicalText = fs.readFileSync(canonical, 'utf8');
    if (nestedText === canonicalText) { try { fs.rmSync(nested, { force: true }); } catch {} continue; }
    let canonicalChanged = false;
    try { canonicalChanged = Boolean(execFileSync('git', ['diff', '--', file], { cwd: worktree, encoding: 'utf8' }).trim()); } catch {}
    if (canonicalChanged) continue;
    fs.copyFileSync(nested, canonical);
    fs.rmSync(nested, { force: true });
    console.warn('[autobot] normalized Aider duplicate src/ prefix: ' + path.relative(worktree, nested) + ' -> ' + file);
  }
}

function normalizeIntroducedWhitespace(base, worktree, files) {
  // Aider occasionally leaves trailing whitespace on newly edited lines.
  // Git's --check intentionally rejects that. Repair only the exact lines Git
  // reports as introduced whitespace errors; do not reformat untouched source.
  let report = '';
  try {
    execFileSync('git', ['diff', base, '--check', '--', ...files], { cwd: worktree, encoding: 'utf8' });
    return;
  } catch (error) {
    report = String(error?.stdout || error?.stderr || '');
  }
  const fixes = new Map();
  for (const line of report.split(/\r?\n/)) {
    const match = line.match(/^(.+?):(\d+): trailing whitespace\.?$/);
    if (!match) continue;
    const file = match[1];
    const lineNumber = Number(match[2]);
    if (!files.includes(file) || !Number.isInteger(lineNumber) || lineNumber < 1) continue;
    if (!fixes.has(file)) fixes.set(file, new Set());
    fixes.get(file).add(lineNumber);
  }
  for (const [file, lineNumbers] of fixes) {
    const target = path.join(worktree, file);
    if (!fs.existsSync(target)) continue;
    const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/);
    let changed = false;
    for (const lineNumber of lineNumbers) {
      const index = lineNumber - 1;
      if (index < 0 || index >= lines.length) continue;
      const cleaned = lines[index].replace(/[ \t]+$/, '');
      if (cleaned !== lines[index]) {
        lines[index] = cleaned;
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(target, lines.join('\n'));
  }
  if (fixes.size) console.warn('[autobot] normalized Aider-introduced trailing whitespace before candidate verification.');
}
function publicExportNames(source) {
  const names = new Set();
  const patterns = [
    /\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+default\b/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) names.add(match[1] || 'default');
  }
  for (const match of source.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
    for (const entry of match[1].split(',')) {
      const name = entry.trim().split(/\s+as\s+/i)[0].trim();
      if (name) names.add(name);
    }
  }
  return names;
}
function assertPublicExportsPreserved(base, worktree, files) {
  for (const file of files) {
    let baseSource;
    try { baseSource = execFileSync('git', ['show', `${base}:${file}`], { cwd: worktree, encoding: 'utf8' }); }
    catch { continue; }
    const candidateSource = fs.readFileSync(path.join(worktree, file), 'utf8');
    const missing = [...publicExportNames(baseSource)].filter(name => !publicExportNames(candidateSource).has(name));
    if (missing.length) throw new Error(`public-export guard failed in ${file}: existing exports removed: ${missing.join(', ')}`);
  }
}

function hasMeaningfulProductPatch(base, worktree, files) {
  try {
    const semantic = execFileSync('git', ['diff', '--ignore-all-space', '--ignore-blank-lines', base, '--', ...files], { cwd: worktree, encoding: 'utf8' });
    return Boolean(semantic.trim());
  } catch { return false; }
}
function runStructuredFallback(worktree, assignmentPath, model, base) {
  candidateOrigin = 'structured-fallback';
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
function writeFailureOutcome({ error, base, worktree, files, candidatePatch = '', aiderOutput = '' }) {
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
    schemaVersion: 'autobot-specialist-outcome-v1', botId, coordinationId: coordinationId || null, objective: objectiveText,
    status: 'failure', category: classification.category, repairable: classification.repairable,
    files, baseCommit: base || null, patchPath,
    evidence: ['GitHub Actions specialist execution logs', patchPath].filter(Boolean),
    error: String(error?.message || error || 'unknown specialist failure'),
    aiderOutputTail: String(aiderOutput || aiderOutputTail || '').slice(-12000), candidateOrigin, aiderAttempted, aiderMaterialized
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
const experimentalWorker = String(process.env.AUTOBOT_EXPERIMENTAL_WORKER || '').trim().toLowerCase() === 'true';
if (bot.status !== 'verified' && !(bot.status === 'experimental' && experimentalWorker)) fail(`Specialist Builder ${botId} is not activated for this execution lane.`);
if (bot.status === 'experimental' && !experimentalWorker) fail(`Experimental specialist ${botId} requires AUTOBOT_EXPERIMENTAL_WORKER=true.`);
if (bot.entrypoint !== 'builder/runner/autobot-specialist-builder.mjs') fail('Registry specialist Builder entrypoint does not match the executable.');
if (!objectiveText) fail('AUTOBOT_SPECIALIST_OBJECTIVE is required.');
if (String(process.env.AUTOBOT_EXPERIMENTAL_WORKER || '').trim().toLowerCase() === 'true' && !coordinationId) fail('AUTOBOT_COORDINATION_ID is required for independent experimental workers.');

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
  run('git', ['config', 'user.name', process.env.AUTOBOT_GIT_USER_NAME || 'Bikeztagram AutoBot'], worktree);
  run('git', ['config', 'user.email', process.env.AUTOBOT_GIT_USER_EMAIL || 'autobot@users.noreply.github.com'], worktree);
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
  const learned = botLearning();
  const targetMap = buildTargetMap(files, objectiveText);
  if (!targetMap.length) fail(`Specialist Builder target map is empty for ${botId}; refusing to spend the AI editing budget without symbol-level anchors.`);
  objective.constraints.push(`Editing strategy: ${learned.targetingMode || 'symbol-first'}. Use the supplied target map, including exact source context, to pinpoint the smallest relevant symbol before editing.`);
  objective.constraints.push(`Preferred Aider map tokens: ${learned.mapTokens || 1024}. Preferred edit format: ${learned.editFormat || 'diff'}.`);
  if (learned.promptHint) objective.constraints.push(`Learned specialist hint: ${learned.promptHint}`);
  fs.mkdirSync(path.dirname(assignmentPath), { recursive: true });
  fs.writeFileSync(assignmentPath, JSON.stringify({ schemaVersion: 'autobot-orchestrator-assignment-v1', specialist: { id: botId, role: bot.role }, objective, targetMap, learning: learned, source: 'parallel-specialist-workflow' }, null, 2) + '\n');

  let requestedMinutes = Math.max(1, Number.parseInt(process.env.BUILDER_MAX_MINUTES || '', 10));
  if (!Number.isFinite(requestedMinutes)) {
    try {
      const eventPath = process.env.GITHUB_EVENT_PATH;
      const event = eventPath && fs.existsSync(eventPath) ? JSON.parse(fs.readFileSync(eventPath, 'utf8')) : {};
      requestedMinutes = parseDurationMinutes(event.inputs?.duration, 15);
    } catch { requestedMinutes = 15; }
  }
  const model = normalizeAiderModel(process.env.AUTOBOT_AIDER_MODEL || process.env.LOCAL_AI_MODEL);
  const protocol = String(process.env.AUTOBOT_FEATURE_PROTOCOL || 'aider-diff-v5').trim();
  const learnedMapTokens = Math.max(512, Math.min(4096, Number(learned.mapTokens || 1024)));
  const learnedEditFormat = ['diff','udiff','whole'].includes(String(learned.editFormat || 'diff')) ? String(learned.editFormat) : 'diff';
  const configuredPasses = Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES || '', 10);
  const singleEditStrategy = /single$/.test(editStrategy);
  const passCount = singleEditStrategy ? 1 : (Number.isFinite(configuredPasses) ? Math.max(1, Math.min(3, configuredPasses)) : requestedMinutes >= 30 ? 2 : 1);
  const verificationReserveMinutes = requestedMinutes >= 60 ? 6 : requestedMinutes >= 30 ? 4 : Math.min(2, Math.max(1, requestedMinutes - 1));
  const controllerFinishGraceMinutes = Math.max(0, Number.parseInt(process.env.AUTOBOT_FINISH_GRACE_MINUTES || '5', 10));
  // Give Aider the controller budget. Historical Run #65 showed that reserving
  // another 5 minutes for fallback left only ~7 minutes for Qwen 7B to edit,
  // while the model was still reasoning. Fallback is recovery, not the primary
  // budget; it must not be purchased by shortening the Aider window.
  const controllerMinutes = Math.max(1, requestedMinutes - verificationReserveMinutes - controllerFinishGraceMinutes);
  // Inherit the proven long-run controller's repeated feature-slice behaviour.
  // Short staging runs stay bounded; longer specialist runs may revisit the same
  // objective through multiple audited feature cycles instead of getting only one
  // Aider pass before the outer fleet cycle restarts them.
  const maxFeatureCycles = Math.max(1, Math.min(12, Math.floor(controllerMinutes / 20) || 1));
  const deadline = Date.now() + controllerMinutes * 60_000;
  const engineEnv = {
    ...process.env,
    AUTOBOT_SPECIALIST_MODE: 'true', AUTOBOT_FEATURE_ENGINE: 'aider', AUTOBOT_SPECIALIST_EDIT_STRATEGY: editStrategy, AUTOBOT_ORCHESTRATOR_ENABLED: 'true', AUTOBOT_SPECIALIST_MAP_TOKENS: String(learnedMapTokens), AUTOBOT_SPECIALIST_AIDER_EDIT_FORMAT: learnedEditFormat,
    AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH: assignmentPath, AUTOBOT_FEATURE_PROTOCOL: protocol,
    AUTOBOT_FEATURE_PASSES: String(passCount), AUTOBOT_FEATURE_DEADLINE_EPOCH_MS: String(deadline),
    AUTOBOT_FEATURE_NORMAL_DEADLINE_EPOCH_MS: String(deadline), AUTOBOT_AIDER_MODEL: model,
    AUTOBOT_FEATURE_SLICE_MINUTES: String(Math.min(singleEditStrategy ? 25 : 20, controllerMinutes)), AUTOBOT_MAX_FEATURE_CYCLES: String(maxFeatureCycles),
    LOCAL_AI_MODEL: process.env.LOCAL_AI_MODEL || model.replace(/^ollama_chat\//, '').replace(/^ollama\//, ''),
    AUTOBOT_AIDER_EDITOR_MODEL: process.env.AUTOBOT_AIDER_EDITOR_MODEL || model,
    BUILDER_MAX_MINUTES: String(controllerMinutes), AUTOBOT_FINISH_GRACE_MINUTES: String(controllerFinishGraceMinutes)
  };
  console.log(`[autobot] specialist ${botId} using edit strategy ${editStrategy}; entering proven long-run controller: ${controllerMinutes}m Aider budget; ${maxFeatureCycles} audited feature cycle(s) x ${Math.min(singleEditStrategy ? 25 : 20, controllerMinutes)}m max slice + ${verificationReserveMinutes}m verification + ${controllerFinishGraceMinutes}m grace; introduced-whitespace repair enabled; fallback is recovery after Aider (${model}, ${protocol})`);
  const engine = spawnSync(process.execPath, ['builder/runner/long-run-executor.mjs'], { cwd: worktree, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: engineEnv, timeout: controllerMinutes * 60_000 + controllerFinishGraceMinutes * 60_000 + 30_000 });
  aiderAttempted = true;
  aiderOutputTail = `${engine.stdout || ''}\n${engine.stderr || ''}`.slice(-12000);
  if (aiderOutputTail) process.stdout.write(aiderOutputTail + '\n');
  if (engine.error && !ownedProductFiles(base, worktree, files).length) console.warn(`[autobot] Aider controller ended with ${engine.error.message}; inspecting worktree before fallback`);
  if (engine.status !== 0 && engine.error && !ownedProductFiles(base, worktree, files).length) console.warn(`[autobot] Aider controller process status: ${engine.status ?? 'error'}`);

  normalizeNestedSrcDuplicate(worktree, files);
  normalizeIntroducedWhitespace(base, worktree, files);
  let candidateFiles = ownedProductFiles(base, worktree, files);
  candidatePatch = captureBasePatch(base, worktree, files);
  aiderMaterialized = Boolean(candidateFiles.length && candidatePatch.trim() && hasMeaningfulProductPatch(base, worktree, files));
  if (candidateFiles.length && candidatePatch.trim() && !aiderMaterialized) console.warn('[autobot] Aider changed only formatting/whitespace; not counting that as materialization, so recovery may continue.');
  if (aiderMaterialized) candidateOrigin = 'aider';

  // A build failure is too late to recover a destructive export rewrite. Guard
  // the candidate contract immediately after Aider/fallback materialization so
  // an editor that removes an existing public export is discarded before build.
  let exportGuardError = null;
  if (candidateFiles.length && candidatePatch.trim()) {
    try { assertPublicExportsPreserved(base, worktree, files); }
    catch (error) { exportGuardError = error; }
  }
  if (exportGuardError) {
    console.warn(`[autobot] rejecting Aider candidate before build: ${exportGuardError.message}`);
    aiderMaterialized = false;
    candidateOrigin = 'structured-fallback';
    const fallbackStatus = runStructuredFallback(worktree, assignmentPath, model, base);
    normalizeNestedSrcDuplicate(worktree, files);
    normalizeIntroducedWhitespace(base, worktree, files);
    candidateFiles = ownedProductFiles(base, worktree, files);
    candidatePatch = captureBasePatch(base, worktree, files);
    if (fallbackStatus !== 0 || !candidateFiles.length || !candidatePatch.trim()) {
      fail(`Specialist Builder public-export recovery failed after Aider rejection (fallback status ${fallbackStatus}).`);
    }
    try { assertPublicExportsPreserved(base, worktree, files); }
    catch (structuredExportError) {
      console.warn(`[autobot] structured fallback also violated public exports; invoking deterministic recovery: ${structuredExportError.message}`);
      run('git', ['reset', '--hard', base], worktree);
      candidateOrigin = 'deterministic-fallback';
      const deterministic = spawnSync(process.execPath, ['builder/runner/autobot-specialist-deterministic-fallback.mjs'], {
        cwd: worktree,
        stdio: 'inherit',
        env: { ...process.env, AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH: assignmentPath, AUTOBOT_SPECIALIST_BASE_COMMIT: base }
      });
      if (deterministic.error || deterministic.status !== 0) fail(`Specialist Builder deterministic public-export recovery failed (status ${deterministic.status ?? 'error'}).`);
      normalizeNestedSrcDuplicate(worktree, files);
      normalizeIntroducedWhitespace(base, worktree, files);
      candidateFiles = ownedProductFiles(base, worktree, files);
      candidatePatch = captureBasePatch(base, worktree, files);
      if (!candidateFiles.length || !candidatePatch.trim()) fail('Deterministic public-export recovery produced no owned product change.');
      assertPublicExportsPreserved(base, worktree, files);
    }
  }

  if (!candidateFiles.length || !candidatePatch.trim()) {
    const fallbackStatus = runStructuredFallback(worktree, assignmentPath, model, base);
    normalizeNestedSrcDuplicate(worktree, files);
    normalizeIntroducedWhitespace(base, worktree, files);
    candidateFiles = ownedProductFiles(base, worktree, files);
    candidatePatch = captureBasePatch(base, worktree, files);
    if (fallbackStatus !== 0 && (!candidateFiles.length || !candidatePatch.trim())) fail(`Specialist Builder produced no product change after Aider and structured fallback (fallback status ${fallbackStatus}).`);
    assertPublicExportsPreserved(base, worktree, files);
  }

  const unauthorized = changedFromBase(base, worktree).filter(file => !files.includes(file) && !file.startsWith('builder/working/'));
  if (unauthorized.length) fail(`Specialist Builder modified out-of-scope files: ${unauthorized.join(', ')}`);
  run('git', ['diff', base, '--check'], worktree);
  const productQuality = String(process.env.AUTOBOT_SPECIALIST_PRODUCT_QUALITY_CHECK || 'npm run verify:autobot-product-change-quality').trim();
  if (!skipNpmInstall) run('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock'], worktree);
  run('npm', ['run', 'build'], worktree);
  try {
    run('sh', ['-lc', productQuality], worktree);
  } catch (qualityError) {
    console.warn(`[autobot] structured fallback candidate failed product-quality guard; resetting to base and invoking deterministic specialist fallback: ${qualityError.message}`);
    run('git', ['reset', '--hard', base], worktree);
    candidateOrigin = 'deterministic-fallback';
    const deterministic = spawnSync(process.execPath, ['builder/runner/autobot-specialist-deterministic-fallback.mjs'], {
      cwd: worktree,
      stdio: 'inherit',
      env: {
        ...process.env,
        AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH: assignmentPath,
        AUTOBOT_SPECIALIST_BASE_COMMIT: base
      }
    });
    if (deterministic.error || deterministic.status !== 0) {
      fail(`Specialist Builder product-quality recovery failed after structured fallback rejection (deterministic status ${deterministic.status ?? 'error'}).`);
    }
    candidateFiles = ownedProductFiles(base, worktree, files);
    candidatePatch = captureBasePatch(base, worktree, files);
    if (!candidateFiles.length || !candidatePatch.trim()) fail('Deterministic specialist fallback produced no owned product change after structured fallback rejection.');
    run('git', ['diff', base, '--check'], worktree);
    run('npm', ['run', 'build'], worktree);
    run('sh', ['-lc', productQuality], worktree);
  }
  const headBeforeCommit = git(['rev-parse', 'HEAD'], worktree);
  if (headBeforeCommit !== base) run('git', ['reset', '--soft', base], worktree);
  run('git', ['add', '--', ...candidateFiles], worktree);
  const staged = git(['diff', '--cached', '--name-only'], worktree).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const stagedUnauthorized = staged.filter(file => !files.includes(file));
  if (stagedUnauthorized.length) fail(`Staged specialist diff escaped declared scope: ${stagedUnauthorized.join(', ')}`);
  if (!staged.length) fail('Specialist Builder produced no product change.');
  run('git', ['commit', '-m', `autobot(${botId}): ${objective.title.slice(0, 72)}`], worktree);
  const candidate = git(['rev-parse', 'HEAD'], worktree);
  candidateOrigin = aiderMaterialized ? 'aider' : candidateOrigin;
  const handoffFile = writeSpecialistHandoff({ schemaVersion: 'autobot-specialist-handoff-v1', botId, coordinationId: coordinationId || null, objective: objectiveText, baseCommit: base, candidateCommit: candidate, branch, ownsFiles: staged, productQualityCheck: productQuality, status: 'verified-candidate', candidateOrigin, aiderAttempted, aiderMaterialized, downstream: { reviewContract: 'AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT' } }, handoffPath);
  fs.mkdirSync(path.dirname(outcomePath), { recursive: true });
  fs.writeFileSync(outcomePath, JSON.stringify({ schemaVersion: 'autobot-specialist-outcome-v1', botId, coordinationId: coordinationId || null, objective: objectiveText, status: 'success', category: 'completed', repairable: false, files: staged, baseCommit: base, patchPath: null, evidence: [handoffFile], engine: 'aider-first-with-structured-fallback', editStrategy, learnedMapTokens, learnedEditFormat, targetMap, aiderOutputTail: aiderOutputTail.slice(-12000), featureEngine: 'builder/runner/aider-feature-brain.mjs', fallbackEngine: 'builder/runner/autobot-specialist-structured-fallback.mjs', passes: passCount, protocol }, null, 2) + '\n');
  keepBranch = true;
  console.log(JSON.stringify({ ok: true, botId, baseCommit: base, candidateCommit: candidate, branch, files: staged, engine: 'aider-first-with-structured-fallback', featureEngine: 'builder/runner/aider-feature-brain', editStrategy, candidateOrigin, aiderAttempted, aiderMaterialized, fallbackEngine: 'builder/runner/autobot-specialist-structured-fallback', passes: passCount, protocol, handoffPath: handoffFile }));
} catch (error) {
  writeFailureOutcome({ error, base, worktree, files, candidatePatch, aiderOutput: aiderOutputTail });
  throw error;
} finally {
  try { run('git', ['worktree', 'remove', '--force', worktree], root); } catch {}
  try { fs.rmSync(worktree, { recursive: true, force: true }); } catch {}
  if (!keepBranch) { try { run('git', ['branch', '-D', branch], root); } catch {} }
}
