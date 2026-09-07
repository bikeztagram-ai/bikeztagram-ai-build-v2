#!/usr/bin/env node
/** Canonical safety contract for the active repository-aware AutoBot runtime. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');
const agent = read('builder/runner/repository-aware-feature-brain.mjs');
const executor = read('builder/runner/repository-aware-executor.mjs');
const index = read('builder/runner/repository-index.mjs');
const deterministic = read('builder/runner/deterministic-executor.mjs');
const gate = read('scripts/autobot/run-production-gate.mjs');
const packageJson = read('package.json');

if (/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow + agent + executor)) failures.push('forbidden Gemini provider reference in active AutoBot runtime');
if (/gh\s+pr\s+merge|gh\s+pr\s+approve/i.test(workflow + agent + executor)) failures.push('automatic merge/approval path detected');
if (/vercel\s+(deploy|promote)|vercel\.com\/api/i.test(workflow + agent + executor)) failures.push('automatic production deployment path detected');
if (!/workflow_dispatch:/.test(workflow)) failures.push('canonical fast workflow must be manually dispatchable');
if (!/cancel-in-progress:\s*false/.test(workflow)) failures.push('fast workflow must preserve queued runs rather than canceling active work');
if (!workflow.includes('qwen3:4b')) failures.push('fast workflow must default to Qwen3 4B-compatible model');
if (!workflow.includes('LOCAL_AI_MODEL')) failures.push('fast workflow lacks explicit local model configuration');
if (!workflow.includes('actions/cache@v4')) failures.push('local model cache missing');

// The fast structured brain deliberately tightened the old 3-edit ceiling to 2.
// Accept either YAML-style or GITHUB_ENV-style configuration, but never >3.
const editBudgetMatch = workflow.match(/AUTOBOT_FEATURE_MAX_EDITS(?:\s*:\s*|=)(\d+)/);
if (!editBudgetMatch || Number(editBudgetMatch[1]) < 1 || Number(editBudgetMatch[1]) > 3) failures.push('fast workflow edit budget missing or unsafe');

// The active workflow exports the timeout through GITHUB_ENV; support both that
// form and a YAML env entry so the validator remains format-agnostic.
const timeoutMatch = workflow.match(/LOCAL_AI_FEATURE_TIMEOUT_SECONDS(?:\s*:\s*|=)(\d+)/);
if (!timeoutMatch || Number(timeoutMatch[1]) < 120 || Number(timeoutMatch[1]) > 300) failures.push('fast workflow feature timeout contract missing or unsafe');
if (!workflow.includes('repository-aware-feature-brain.mjs')) failures.push('fast workflow lacks repository-aware agent');
if (!workflow.includes('repository-aware-executor.mjs')) failures.push('fast workflow lacks repository-aware executor');
if (!workflow.includes('verify:autobot-production-gate')) failures.push('fast workflow lacks authoritative production gate');
if (!workflow.includes('Require a real product-source change')) failures.push('fast workflow lacks product-source success gate');
if (!workflow.includes("grep -E '^(src|public)/'")) failures.push('product-source gate must include src and public');

for (const [pattern, message] of [
  [/objectiveContext/, 'deterministic objective context router missing'],
  [/read_file/, 'objective-scoped read tool missing'],
  [/edit_file/, 'objective-scoped edit tool missing'],
  [/run_check/, 'verification tool missing'],
  [/submit/, 'submission tool missing'],
  [/maxEdits/, 'bounded edit ceiling missing'],
  [/temperature\s*:\s*0/, 'deterministic model temperature missing'],
  [/think\s*:\s*false/, 'thinking must be disabled in fast mode'],
  [/npm.*run.*build/, 'build verification missing'],
  [/git.*diff.*--check/, 'diff verification missing'],
  [/repository-aware-agent-v7/, 'agent protocol marker missing'],
  [/isSensitive/, 'sensitive-path protection missing'],
]) if (!pattern.test(agent)) failures.push(message);

for (const [pattern, message] of [
  [/function:\s*\{\s*name:\s*'search_repo'/, 'search_repo tool must not be exposed'],
  [/function:\s*\{\s*name:\s*'list_files'/, 'list_files tool must not be exposed'],
  [/function:\s*\{\s*name:\s*'repository_map'/, 'repository_map tool must not be exposed'],
]) if (pattern.test(agent)) failures.push(message);

if (/git.*reset.*--hard|git.*clean\s+-f/.test(agent + executor)) failures.push('repository-aware agent contains unsafe wholesale rollback');
if (!executor.includes('repository-index.mjs') || !executor.includes('repository-aware-feature-brain.mjs')) failures.push('executor does not wire repository index and feature agent');
if (!index.includes('git') || !index.includes('dependencyEdges') || !index.includes('sensitive')) failures.push('repository index lacks source-of-truth, dependency and sensitive-path protections');
if (!deterministic.includes('allowedTask')) failures.push('deterministic executor lacks protected-path guard');
if (!gate.includes('verify:generation-capability-contract') || !gate.includes('verify:autobot-audit-tamper')) failures.push('authoritative production gate is incomplete');
if (!packageJson.includes('verify:autobot-production-gate')) failures.push('production gate is not registered in package scripts');

if (failures.length) { console.error(failures.map((f) => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot canonical safety contract PASS: deterministic context routing, objective-scoped writes, bounded verification, dependency-safe deterministic work, no Gemini/paid fallback, and no automatic merge/deploy.');
