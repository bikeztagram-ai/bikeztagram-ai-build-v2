#!/usr/bin/env node
import fs from 'node:fs';
const feature = fs.readFileSync('builder/runner/repository-aware-feature-brain.mjs', 'utf8');
const runner = fs.readFileSync('builder/runner/repository-aware-executor.mjs', 'utf8');
const index = fs.readFileSync('builder/runner/repository-index.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml', 'utf8');
const installer = fs.readFileSync('scripts/autobot/install-local-brain.sh', 'utf8');
const failures = [];
for (const [pattern, message] of [
  [/objectiveContext/, 'deterministic objective context router missing'],
  [/DETERMINISTIC OBJECTIVE CONTEXT/, 'agent must receive deterministic objective context'],
  [/read_file/, 'scoped read tool missing'],
  [/edit_file/, 'edit tool missing'],
  [/run_check/, 'verification tool missing'],
  [/tools\s*=\s*\[/, 'native tool definitions missing'],
  [/temperature\s*:\s*0/, 'deterministic temperature missing'],
  [/think\s*:\s*false/, 'Qwen thinking must be disabled for fast tool-use mode'],
  [/npm.*run.*build/, 'build verification missing'],
  [/git.*diff.*--check/, 'diff verification missing'],
  [/maxEdits/, 'bounded edit budget missing'],
  [/repository-aware-agent-v7/, 'current repository-aware protocol marker missing'],
  [/matchAll\(\/.*tool_call/, 'fallback tool-call parsing missing'],
  [/emptyTurns/, 'prose-only response guard missing'],
  [/out-of-scope write/, 'objective-scoped write guard missing'],
  [/isSensitive/, 'sensitive path guard missing']
]) if (!pattern.test(feature)) failures.push(message);
for (const [pattern, message] of [
  [/function:\s*\{\s*name:\s*'search_repo'/, 'search_repo tool must be removed from the agent surface'],
  [/function:\s*\{\s*name:\s*'list_files'/, 'list_files tool must be removed from the agent surface'],
  [/function:\s*\{\s*name:\s*'repository_map'/, 'repository_map tool must be removed from the agent surface']
]) if (pattern.test(feature)) failures.push(message);
for (const [pattern, message] of [
  [/repository-index/, 'executor does not refresh repository index'],
  [/repository-aware-feature-brain/, 'executor does not invoke repository-aware feature brain']
]) if (!pattern.test(runner)) failures.push(message);
for (const [pattern, message] of [
  [/ls-files/, 'index must use Git file inventory'],
  [/ls-files.*exclude-standard/, 'index must exclude ignored files'],
  [/dependencyEdges/, 'index must capture dependency edges'],
  [/sensitive/, 'index must exclude sensitive files']
]) if (!pattern.test(index)) failures.push(message);
if (/git.*reset.*--hard/.test(feature)) failures.push('feature agent must not hard reset');
if (!/AUTOBOT_FEATURE_MAX_EDITS:\s*3/.test(workflow)) failures.push('fast workflow must allow three bounded edits');
if (!/AUTOBOT_AGENT_TURNS:\s*8/.test(workflow)) failures.push('fast workflow must bound agent turns');
if (!/LOCAL_AI_FEATURE_TIMEOUT_SECONDS:\s*180/.test(workflow)) failures.push('fast workflow must use the shorter feature timeout');
if (!/default: qwen3:4b/.test(workflow)) failures.push('fast workflow must default to qwen3:4b-compatible model');
if (!/repository-aware-feature-brain\.mjs/.test(workflow)) failures.push('workflow must run repository-aware feature brain');
if (!/repository-aware-executor\.mjs/.test(workflow)) failures.push('workflow must run repository-aware executor');
if (!/git fetch --no-tags origin main/.test(workflow)) failures.push('checkpoint must fetch protected base before publishing');
if (!/git switch --detach origin\/main/.test(workflow)) failures.push('checkpoint must start from protected main');
if (!/git checkout \"\$source_sha\" -- \. ':\(exclude\)\.github\/workflows\/\*\*'/.test(workflow)) failures.push('checkpoint must copy source changes without workflows');
if (!/git restore --source=origin\/main -- \.github\/workflows/.test(workflow)) failures.push('checkpoint must restore autonomous workflow changes from protected base');
if (!/git reset -- \.github\/workflows builder\/working/.test(workflow)) failures.push('checkpoint must never stage workflow or disposable builder state');
if (!/qwen3:4b/.test(installer)) failures.push('local brain installer must target qwen3:4b-compatible model');
if (/qwen3:8b/.test(installer)) failures.push('local brain installer must not silently fall back to qwen3:8b');
if (!/\\"think\\":false/.test(installer)) failures.push('local brain smoke tests must explicitly disable Qwen thinking');
if (failures.length) {
  console.error('[autobot] repository-aware resilience FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] repository-aware resilience PASS');
