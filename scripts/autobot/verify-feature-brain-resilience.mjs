#!/usr/bin/env node
import fs from 'node:fs';
const feature = fs.readFileSync('builder/runner/repository-aware-feature-brain.mjs', 'utf8');
const runner = fs.readFileSync('builder/runner/repository-aware-executor.mjs', 'utf8');
const index = fs.readFileSync('builder/runner/repository-index.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml', 'utf8');
const installer = fs.readFileSync('scripts/autobot/install-local-brain.sh', 'utf8');
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
  [/think\s*:\s*false/, 'Qwen thinking must be disabled for fast tool-use mode'],
  [/npm.*run.*build/, 'build verification missing'],
  [/git.*diff.*--check/, 'diff verification missing'],
  [/maxEdits/, 'bounded edit budget missing'],
  [/repository-aware-agent-v6/, 'current repository-aware protocol marker missing'],
  [/matchAll\(\/.*tool_call/, 'fallback tool-call parsing missing'],
  [/emptyTurns/, 'prose-only response guard missing']
]) if (!pattern.test(feature)) failures.push(message);
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
if (!/default: qwen3:4b/.test(workflow)) failures.push('fast workflow must default to qwen3:4b');
if (!/repository-aware-feature-brain\.mjs/.test(workflow)) failures.push('workflow must run repository-aware feature brain');
if (!/repository-aware-executor\.mjs/.test(workflow)) failures.push('workflow must run repository-aware executor');
if (!/git fetch --no-tags origin main/.test(workflow)) failures.push('checkpoint must fetch protected base before publishing');
if (!/git switch --detach origin\/main/.test(workflow)) failures.push('checkpoint must start from protected main');
if (!/git checkout \"\$source_sha\" -- \. ':\(exclude\)\.github\/workflows\/\*\*'/.test(workflow)) failures.push('checkpoint must copy source changes without workflows');
if (!/git restore --source=origin\/main -- \.github\/workflows/.test(workflow)) failures.push('checkpoint must restore autonomous workflow changes from protected base');
if (!/git reset -- \.github\/workflows builder\/working/.test(workflow)) failures.push('checkpoint must never stage workflow or disposable builder state');
if (!/qwen3:4b/.test(installer)) failures.push('local brain installer must target qwen3:4b');
if (/qwen3:8b/.test(installer)) failures.push('local brain installer must not silently fall back to qwen3:8b');
if (!/\\"think\\":false/.test(installer)) failures.push('local brain smoke tests must explicitly disable Qwen thinking');
if (failures.length) {
  console.error('[autobot] repository-aware resilience FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] repository-aware resilience PASS');
