#!/usr/bin/env node
/** Final formatting-tolerant contract for the active fast structured-Qwen runtime. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const brain = read('builder/runner/repository-aware-fast-brain.mjs');
const executor = read('builder/runner/repository-aware-fast-executor.mjs');
const indexer = read('builder/runner/repository-index.mjs');
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');

for (const [pattern, message] of [
  [/\/api\/chat/, 'structured brain must use Ollama chat'],
  [/stream:\s*false/, 'structured brain must use non-streaming responses'],
  [/think:\s*false/, 'structured brain must disable thinking'],
  [/temperature:\s*0/, 'structured brain must use deterministic temperature'],
  [/NUM_CTX\s*=\s*3072/, 'structured brain context must be bounded'],
  [/NUM_PREDICT\s*=\s*240/, 'structured brain output must be bounded'],
  [/function\s+chooseObjective/, 'deterministic objective selection missing'],
  [/function\s+contextFor/, 'objective-scoped context missing'],
  [/maxEdits/, 'bounded edit budget missing'],
  [/safe\(file\)/, 'sensitive/path safety missing'],
  [/must match exactly once/, 'exact-match write protection missing'],
  [/restore\(snapshots\)/, 'rollback protection missing'],
  [/run\('npm', \['run', 'build'\]\)/, 'build verification missing'],
  [/\['diff', '--', 'src', 'public'\]/, 'product-source diff verification missing'],
  [/state\.failed/, 'durable failure state missing'],
]) if (!pattern.test(brain)) failures.push(message);
if (/git\s+reset\s+--hard|git\s+clean\s+-f/.test(brain + executor)) failures.push('fast runtime must never wholesale reset or clean the working tree');
if (!executor.includes('repository-index.mjs') || !executor.includes('repository-aware-fast-brain.mjs')) failures.push('fast executor must refresh index and invoke structured brain');
if (!indexer.includes('ls-files') || !indexer.includes('dependencyEdges') || !indexer.includes('sensitive')) failures.push('repository index must be Git-derived, dependency-aware and secret-safe');
if (!workflow.includes('workflow_dispatch:')) failures.push('canonical workflow must be dispatchable');
if (!workflow.includes('repository-aware-fast-executor.mjs')) failures.push('canonical workflow must invoke fast executor');
if (!workflow.includes('repository-aware-fast-brain.mjs')) failures.push('canonical workflow must include fast brain');
if (!workflow.includes('AUTOBOT_AGENT_TURNS=1')) failures.push('canonical workflow must enforce one model request per feature attempt');
if (!workflow.includes('AUTOBOT_FEATURE_MAX_EDITS=1')) failures.push('canonical workflow must enforce one-edit maximum');
if (!workflow.includes('LOCAL_AI_PROXY_THINK=false')) failures.push('proxy must explicitly disable thinking');

try { execFileSync(process.execPath, ['builder/runner/repository-index.mjs'], { cwd: root, stdio: 'ignore' }); }
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

if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot safety contract v3 PASS: active structured-Qwen brain, bounded one-request edits, scoped context, rollback, verification, dependency-aware index and protected checkpoint runtime present.');
