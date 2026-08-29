#!/usr/bin/env node
/**
 * Bikeztagram local product-engineering brain.
 * The model is allowed to work on a complete feature objective while the
 * repository quality gates remain outside the model's control.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '60', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b';
const ollamaUrl = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const started = Date.now();
const maxPasses = Math.max(4, Number.parseInt(process.env.AUTOBOT_LOCAL_PASSES || '1000', 10));
const perPassSeconds = Math.max(45, Number.parseInt(process.env.LOCAL_AI_PASS_TIMEOUT_SECONDS || '120', 10));
const featureFile = path.join(root, 'builder', 'brain', 'feature-objectives.json');
const memoryFile = path.join(root, 'builder', 'quality', 'project-memory.md');
const lessonsFile = path.join(root, 'builder', 'quality', 'lessons.md');
let pass = 0;
let previousFailure = '';

const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
const status = () => run('git', ['status', '--porcelain']).trim();
const read = (file, limit) => { if (!fs.existsSync(file)) return ''; const text = fs.readFileSync(file, 'utf8'); return text.length <= limit ? text : `${text.slice(0, limit)}\n...[truncated]...`; };

function loadObjectives() {
  try { return JSON.parse(fs.readFileSync(featureFile, 'utf8')).objectives || []; }
  catch { return []; }
}
function chooseObjective(objectives) {
  const requested = process.env.AUTOBOT_FEATURE_OBJECTIVE;
  if (requested) { const found = objectives.find(o => o.id === requested); if (found) return found; }
  return objectives[pass % Math.max(1, objectives.length)] || {
    id: 'general-production-quality',
    title: 'Improve Bikeztagram production quality',
    files: ['src/App.jsx'],
    objective: 'Make one concrete user-visible production improvement.',
    acceptanceCriteria: ['npm run build passes']
  };
}
function context(files) {
  const parts = [
    `===== PROJECT MEMORY =====\n${read(memoryFile, 4500)}`,
    `===== LESSONS =====\n${read(lessonsFile, 4000)}`,
    `===== PACKAGE =====\n${read(path.join(root, 'package.json'), 3000)}`
  ];
  for (const file of files) parts.push(`===== ${file} =====\n${read(path.join(root, file), 8500)}`);
  return parts.join('\n\n').slice(0, 36000);
}
function callModel(prompt) {
  const body = JSON.stringify({ model, stream: false, keep_alive: '10m', options: { temperature: 0.05, num_ctx: 12288, num_predict: 4500 }, messages: [
    { role: 'system', content: 'You are Bikeztagram AI, a senior autonomous product engineer. Implement the requested feature in the existing production repository. Return ONLY one valid unified git diff. You may modify ONLY the files explicitly listed as allowed files for this objective. Do not touch workflows, builder infrastructure, secrets, dependencies, or protected paths. Do not invent APIs or media. Preserve public contracts. Make a coherent implementation, not a placeholder.' },
    { role: 'user', content: prompt }
  ]});
  const timeout = Math.min(perPassSeconds, Math.max(45, Math.floor(left() * 60)));
  const out = spawnSync('curl', ['-sS', '--fail', '--max-time', String(timeout), `${ollamaUrl}/api/chat`, '-H', 'Content-Type: application/json', '-d', body], { cwd: root, encoding: 'utf8' });
  if (out.status !== 0) throw new Error(out.stderr || `local model request failed (${out.status})`);
  return JSON.parse(out.stdout)?.message?.content || '';
}
function cleanPatch(text) { const fenced = text.match(/```(?:diff|patch)?\s*([\s\S]*?)```/i); const candidate = fenced ? fenced[1] : text; const start = candidate.indexOf('diff --git '); return start >= 0 ? candidate.slice(start).trim() : ''; }
function patchPaths(patch) { return [...patch.matchAll(/^diff --git a\/([^\n]+) b\/([^\n]+)$/gm)].map(m => m[2]); }
function meaningful(patch, allowed) {
  if (!patch) return false;
  const paths = patchPaths(patch);
  if (!paths.length || paths.some(p => !allowed.includes(p))) return false;
  const added = patch.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
  const codeAdded = added.filter(l => !/^\+\s*(?:\/\/|\/\*|\*|#|$)/.test(l));
  return codeAdded.length >= 3 && added.length <= 500;
}
function apply(patch) { const file = path.join(root, '.autobot-local.patch'); fs.writeFileSync(file, patch, 'utf8'); try { run('git', ['apply', '--index', '--whitespace=fix', file], { stdio: 'inherit' }); } finally { fs.rmSync(file, { force: true }); } }
function build() { try { run('npm', ['run', 'build'], { stdio: 'inherit', timeout: 15 * 60 * 1000 }); return true; } catch (e) { previousFailure = `${e.stdout || ''}\n${e.stderr || ''}\n${e.message}`.slice(-24000); return false; } }

if (process.env.LOCAL_AI_READY !== '1') { console.error('[autobot] Local AI is not ready; refusing paid-API fallback.'); process.exit(2); }
const objectives = loadObjectives();
while (pass < maxPasses && left() > 1) {
  pass++;
  const objective = chooseObjective(objectives);
  const allowed = objective.files || [];
  const prompt = `Implement ONE complete production feature objective.\n\nOBJECTIVE: ${objective.title}\nID: ${objective.id}\nGOAL: ${objective.objective}\nALLOWED FILES: ${allowed.join(', ')}\nACCEPTANCE CRITERIA:\n${(objective.acceptanceCriteria || []).map(x => `- ${x}`).join('\n')}\n\nRules:\n- Work coherently across the allowed files when the feature requires it.\n- Do not modify files outside the allowed list.\n- Do not merely add comments, TODOs, placeholders, or formatting.\n- Preserve existing working behaviour.\n- Keep the change focused and production-safe.\n- If the previous attempt failed, repair that failure first.\n- Return ONLY a unified git diff.\n\nPREVIOUS FAILURE:\n${previousFailure || 'none'}\n\nREPOSITORY CONTEXT:\n${context(allowed)}\n\nTIME REMAINING: ${left().toFixed(1)} minutes.`;
  console.log(`[autobot] Feature-engineer pass ${pass}/${maxPasses}; objective=${objective.id}; allowed=${allowed.join(',')}; model=${model}; ${left().toFixed(1)}m remaining`);
  let response;
  try { response = callModel(prompt); } catch (e) { previousFailure = e.message; console.error(`[autobot] model request failed: ${previousFailure}`); continue; }
  const patch = cleanPatch(response);
  if (!meaningful(patch, allowed)) { previousFailure = 'Model produced an empty, weak, or out-of-scope feature patch.'; console.log('[autobot] rejected invalid feature patch; continuing.'); continue; }
  try { apply(patch); run('git', ['diff', '--check'], { stdio: 'inherit' }); }
  catch (e) { previousFailure = `patch validation failed: ${e.message}`; console.error(`[autobot] rejected patch: ${previousFailure}`); continue; }
  if (build()) { console.log(`[autobot] VERIFIED feature implementation: ${objective.id}`); previousFailure = ''; break; }
  console.error('[autobot] feature build failed; retaining failure evidence for self-repair pass.');
}
console.log(`[autobot] Feature-engineering layer finished after ${pass} passes and ${((Date.now() - started) / 60000).toFixed(2)} minutes.`);
