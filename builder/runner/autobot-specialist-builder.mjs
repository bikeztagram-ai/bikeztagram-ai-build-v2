import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const worktree = path.join(root, 'builder', 'working');
const planPath = path.join(worktree, 'autobot-parallel-plan.json');

function git(args, cwd = root) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}
function fail(message) { throw new Error(message); }

const botId = process.env.AUTOBOT_SPECIALIST || process.argv[2];
if (!botId) fail('AUTOBOT_SPECIALIST is required');
if (!fs.existsSync(planPath)) fail(`Missing planner artifact: ${planPath}`);

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const specialist = (plan.packages || []).find(p => p.specialist === botId);
if (!specialist) fail(`No assigned package found for specialist ${botId}`);

const allowedFiles = Array.isArray(specialist.allowedFiles) ? specialist.allowedFiles : [];
if (!allowedFiles.length) fail(`Specialist ${botId} has no allowed files`);

const objective = String(specialist.objective || '').trim();
if (!objective) fail(`Specialist ${botId} has no objective`);

const prompt = [
  `You are the specialist ${botId} for Bikeztagram AI.`,
  `Specialist objective: ${objective}`,
  '',
  'Acceptance criteria:',
  ...(Array.isArray(specialist.acceptance) ? specialist.acceptance.map(x => `- ${x}`) : []),
  '',
  `You may modify ONLY these declared product files: ${allowedFiles.join(', ')}`,
  'Inspect callers, contracts, tests and production wiring before editing.',
  'Do not weaken validators, safety rules, production gates, rollback, audit or protected infrastructure.',
  'Do not modify package/dependency manifests, workflows, environment files, the fleet registry, or AutoBot runners.',
  'Do not invent media, fake capabilities, Gemini dependencies, or unsupported claims.',
  'Implement the smallest complete product-quality change that genuinely serves the objective.',
  'Run targeted verification and npm run build before finishing.',
  'Do not merge or push. Leave a clean, reviewable commit-ready working tree.'
].join('\n');

const aider = String(process.env.AIDER_BIN || 'aider').trim();
const model = String(process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:7b').trim();
const apiBase = String(process.env.OLLAMA_HOST || 'http://127.0.0.1:11435').trim();
const normalizedBase = apiBase.replace(/\/$/, '');
const aiderModel = model.startsWith('ollama_chat/') || model.startsWith('ollama/') ? model : `ollama_chat/${model}`;
console.log(`[autobot] specialist ${botId} using local Aider model ${aiderModel} via ${normalizedBase}`);
const aiderEnv = { ...process.env, OLLAMA_API_BASE: normalizedBase };
const result = spawnSync(aider, ['--model', aiderModel, '--yes-always', '--no-auto-commits', '--no-dirty-commits', '--no-gitignore', '--map-tokens=768', '--subtree-only', '--message', prompt, ...allowedFiles], { cwd: worktree, encoding: 'utf8', stdio: 'inherit', env: aiderEnv });
if (result.status !== 0) fail(`aider failed with status ${result.status}`);

const changed = git(['diff', 'HEAD', '--name-only'], worktree).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
for (const file of changed) if (!allowedFiles.includes(file)) fail(`Specialist ${botId} changed undeclared file: ${file}`);
if (!changed.length) fail(`Specialist ${botId} produced no product changes`);

const handoffDir = path.join(worktree, 'builder', 'working');
fs.mkdirSync(handoffDir, { recursive: true });
fs.writeFileSync(path.join(handoffDir, 'autobot-specialist-handoff.json'), JSON.stringify({ specialist: botId, objective, changedFiles: changed }, null, 2));
console.log(`[autobot] specialist ${botId} changed ${changed.length} declared product file(s)`);
