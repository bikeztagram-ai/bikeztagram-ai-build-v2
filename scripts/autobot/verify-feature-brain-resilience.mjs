#!/usr/bin/env node
import fs from 'node:fs';
const feature = fs.readFileSync('builder/runner/repository-aware-feature-brain.mjs', 'utf8');
const runner = fs.readFileSync('builder/runner/repository-aware-executor.mjs', 'utf8');
const index = fs.readFileSync('builder/runner/repository-index.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml', 'utf8');
const failures = [];
for (const [pattern, message] of [
  [/repository_map/, 'repository map tool missing'],
  [/list_files/, 'file listing tool missing'],
  [/search_repo/, 'repository search tool missing'],
  [/read_file/, 'broad read tool missing'],
  [/edit_file/, 'edit tool missing'],
  [/run_check/, 'verification tool missing'],
  [/tools\s*=\s*\[/, 'native tool definitions missing'],
  [/temperature\s*:\s*0/, 'deterministic temperature missing'],
  [/npm.*run.*build/, 'build verification missing'],
  [/git.*diff.*--check/, 'diff verification missing'],
  [/maxEdits/, 'bounded edit budget missing'],
  [/repository-aware-agent-v5/, 'repository-aware protocol marker missing']
]) if (!pattern.test(feature)) failures.push(message);
for (const [pattern, message] of [
  [/repository-index/, 'executor does not refresh repository index'],
  [/repository-aware-feature-brain/, 'executor does not invoke repository-aware feature brain']
]) if (!pattern.test(runner)) failures.push(message);
for (const [pattern, message] of [
  [/git ls-files/, 'index must use Git tracked files'],
  [/dependencyEdges/, 'index must capture dependency edges'],
  [/sensitive/, 'index must exclude sensitive files']
]) if (!pattern.test(index)) failures.push(message);
if (/git.*reset.*--hard/.test(feature)) failures.push('feature agent must not hard reset');
if (!/AUTOBOT_FEATURE_MAX_EDITS:\s*3/.test(workflow)) failures.push('fast workflow must allow three bounded edits');
if (!/repository-aware-feature-brain\.mjs/.test(workflow)) failures.push('workflow must run repository-aware feature brain');
if (!/repository-aware-executor\.mjs/.test(workflow)) failures.push('workflow must run repository-aware executor');
if (failures.length) {
  console.error('[autobot] repository-aware resilience FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] repository-aware resilience PASS');
