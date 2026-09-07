#!/usr/bin/env node
/** Formatting-tolerant safety contract for the active repository-aware coding agent. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const agent = read('builder/runner/repository-aware-feature-brain.mjs');
const executor = read('builder/runner/repository-aware-executor.mjs');
const indexer = read('builder/runner/repository-index.mjs');
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');

const required = [
  [/tools\s*=\s*\[/, 'repository-aware agent must expose structured tools'],
  [/repository_map/, 'repository map tool missing'],
  [/list_files/, 'file listing tool missing'],
  [/search_repo/, 'repository search tool missing'],
  [/read_file/, 'broad repository read tool missing'],
  [/edit_file/, 'safe product edit tool missing'],
  [/run_check/, 'verification tool missing'],
  [/maxEdits/, 'bounded edit budget missing'],
  [/temperature\s*:\s*0/, 'deterministic model setting missing'],
  [/npm.*run.*build/, 'independent build verification missing'],
  [/git.*diff.*--check/, 'diff verification missing'],
  [/repository-aware-agent-v5/, 'current agent protocol marker missing'],
  [/repository-index.mjs/, 'repository index integration missing'],
  [/(chooseObjective|function\s+choose)/, 'deterministic objective selection missing'],
  [/progress\[(?:objective|o)\.id\]/, 'incremental objective progress missing'],
];
for (const [pattern, message] of required) if (!pattern.test(agent)) failures.push(message);
if (/git.*reset.*--hard|git.*clean\s+-f/.test(agent + executor)) failures.push('agent must never wholesale-reset or clean the working tree');
if (!/repository-index\.mjs/.test(executor) || !/repository-aware-feature-brain\.mjs/.test(executor)) failures.push('executor must refresh and invoke repository-aware runtime');
if (!/git ls-files/.test(indexer) || !/dependencyEdges/.test(indexer) || !/sensitive/.test(indexer)) failures.push('repository index must be Git-derived, dependency-aware and secret-safe');
if (!/workflow_dispatch:/.test(workflow)) failures.push('canonical fast workflow must be dispatchable');
if (!/AUTOBOT_FEATURE_MAX_EDITS:\s*3/.test(workflow)) failures.push('canonical fast workflow edit ceiling missing');
if (!/LOCAL_AI_FEATURE_TIMEOUT_SECONDS:\s*120/.test(workflow)) failures.push('canonical fast workflow timeout missing');
if (!/LOCAL_AI_MODEL:\s*\$\{\{ inputs\.local_model \}\}/.test(workflow)) failures.push('canonical workflow model input missing');

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
console.log('AutoBot safety contract v3 PASS: repository-aware exploration, scoped writes, deterministic verification, dependency-aware objectives and protected local-agent runtime present.');
