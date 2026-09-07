#!/usr/bin/env node
/** Formatting-tolerant safety contract for the active repository-aware coding agent. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const agent = read('builder/runner/repository-aware-feature-brain.mjs');
const fastBrain = read('builder/runner/repository-aware-fast-brain.mjs');
const executor = read('builder/runner/repository-aware-executor.mjs');
const fastExecutor = read('builder/runner/repository-aware-fast-executor.mjs');
const indexer = read('builder/runner/repository-index.mjs');
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');

const required = [
  [/tools\s*=\s*\[/, 'repository-aware agent must expose structured tools'],
  [/objectiveContext/, 'deterministic objective context router missing'],
  [/read_file/, 'objective-scoped read tool missing'],
  [/edit_file/, 'safe product edit tool missing'],
  [/run_check/, 'verification tool missing'],
  [/submit/, 'submission tool missing'],
  [/maxEdits/, 'bounded edit budget missing'],
  [/temperature\s*:\s*0/, 'deterministic model setting missing'],
  [/think\s*:\s*false/, 'fast mode must disable thinking'],
  [/repository-aware-agent-v7/, 'current agent protocol marker missing'],
  [/isSensitive/, 'sensitive-path protection missing'],
  [/(chooseObjective|function\s+choose)/, 'deterministic objective selection missing'],
  [/progress\[(?:objective|o)\.id\]/, 'incremental objective progress missing'],
];
for (const [pattern, message] of required) if (!pattern.test(agent)) failures.push(message);
const agentHasBuild = /run\(\s*['\"]npm['\"]\s*,\s*\[\s*['\"]run['\"]\s*,\s*['\"]build['\"]/.test(agent) || /npm.*run.*build/.test(agent);
const agentHasDiffCheck = /run\(\s*['\"]git['\"]\s*,\s*\[\s*['\"]diff['\"]\s*,\s*['\"]--check['\"]/.test(agent) || /git.*diff.*--check/.test(agent);
if (!agentHasBuild) failures.push('independent build verification missing');
if (!agentHasDiffCheck) failures.push('diff verification missing');
for (const [pattern, message] of [
  [/function:\s*\{\s*name:\s*'search_repo'/, 'search_repo tool must be removed'],
  [/function:\s*\{\s*name:\s*'list_files'/, 'list_files tool must be removed'],
  [/function:\s*\{\s*name:\s*'repository_map'/, 'repository_map tool must be removed'],
]) if (pattern.test(agent)) failures.push(message);
if (/git.*reset.*--hard|git.*clean\s+-f/.test(agent + fastBrain + executor + fastExecutor)) failures.push('agent must never wholesale-reset or clean the working tree');
if (!/repository-index\.mjs/.test(executor) || !/repository-aware-feature-brain\.mjs/.test(executor)) failures.push('legacy executor must retain repository index and scoped runtime wiring');
if (!/repository-index\.mjs/.test(fastExecutor) || !/repository-aware-fast-brain\.mjs/.test(fastExecutor)) failures.push('fast executor must refresh repository index and invoke structured brain');
if (!/ls-files/.test(indexer) || !/dependencyEdges/.test(indexer) || !/sensitive/.test(indexer)) failures.push('repository index must be Git-derived, dependency-aware and secret-safe');
if (!/workflow_dispatch:/.test(workflow)) failures.push('canonical fast workflow must be dispatchable');
const editMatch = workflow.match(/AUTOBOT_FEATURE_MAX_EDITS[^\n]*?[=:]\s*[\"']?(\d+)/);
if (!editMatch || Number(editMatch[1]) < 1 || Number(editMatch[1]) > 3) failures.push('canonical fast workflow edit ceiling missing or unsafe');
const timeoutMatch = workflow.match(/LOCAL_AI_FEATURE_TIMEOUT_SECONDS[^\n]*?[=:]\s*[\"']?(\d+)/);
if (!timeoutMatch || Number(timeoutMatch[1]) < 120 || Number(timeoutMatch[1]) > 300) failures.push('canonical fast workflow feature timeout must be between 120 and 300 seconds');
if (!/LOCAL_AI_MODEL:\s*\$\{\{ inputs\.local_model \}\}/.test(workflow)) failures.push('canonical workflow model input missing');
if (!workflow.includes('repository-aware-fast-executor.mjs')) failures.push('canonical workflow must invoke the fast executor');
if (!workflow.includes('repository-aware-fast-brain.mjs')) failures.push('canonical workflow must include the structured brain');

const fastBrainHasBuild = /run\(\s*['\"]npm['\"]\s*,\s*\[\s*['\"]run['\"]\s*,\s*['\"]build['\"]/.test(fastBrain) || /npm\s+run\s+build/.test(fastBrain);
const fastBrainHasProductDiff = /run\(\s*['\"]git['\"]\s*,\s*\[\s*['\"]diff['\"]\s*,\s*['\"]--['\"]\s*,\s*['\"]src['\"]\s*,\s*['\"]public['\"]/.test(fastBrain) || /git\s+diff\s+--\s+src\s+public/.test(fastBrain);
if (!fastBrainHasBuild) failures.push('structured coding brain build verification missing');
if (!fastBrainHasProductDiff) failures.push('structured coding brain product-source diff verification missing');

try { execFileSync(process.execPath, ['builder/runner/repository-index.mjs'], { cwd: root, stdio: 'inherit' }); }
catch { failures.push('repository index failed during contract verification'); }
const mapPath = path.join(root, 'builder/working/repository-map.json');
if (!fs.existsSync(mapPath)) failures.push('repository map missing after refresh');
if (fs.existsSync(mapPath)) {
  try {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    if (map.version !== 1 || !Array.isArray(map.files) || !map.byPath || !Array.isArray(map.dependencyEdges)) failures.push('repository map schema invalid');
    if (!map.files.length) failures.push('repository map contains no files');
  } catch { failures.push('repository map is invalid JSON'); }
}

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('AutoBot safety contract v3 PASS: fast structured Qwen brain, deterministic objective context, scoped writes, verification, dependency-aware objectives and protected local-agent runtime present.');
