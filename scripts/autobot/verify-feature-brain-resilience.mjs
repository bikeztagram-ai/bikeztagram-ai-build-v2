#!/usr/bin/env node
/** Resilience contract for the active fast structured-Qwen runtime. */
import fs from 'node:fs';
const feature = fs.readFileSync('builder/runner/repository-aware-fast-brain.mjs', 'utf8');
const runner = fs.readFileSync('builder/runner/repository-aware-fast-executor.mjs', 'utf8');
const index = fs.readFileSync('builder/runner/repository-index.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml', 'utf8');
const installer = fs.readFileSync('scripts/autobot/install-local-brain.sh', 'utf8');
const failures = [];
for (const [pattern, message] of [
  [/function\s+dependenciesMet/, 'dependency-aware objective routing missing'],
  [/function\s+chooseObjective/, 'deterministic objective selection missing'],
  [/contextFor\(/, 'objective-scoped source context missing'],
  [/\/api\/chat/, 'Ollama chat runtime missing'],
  [/stream:\s*false/, 'non-streaming structured response missing'],
  [/think:\s*false/, 'Qwen thinking must be disabled'],
  [/temperature:\s*0/, 'deterministic temperature missing'],
  [/num_predict:\s*420/, 'bounded output missing'],
  [/maxEdits/, 'bounded edit budget missing'],
  [/search must match exactly once/, 'exact-match write guard missing'],
  [/restore\(snapshots\)/, 'scoped rollback missing'],
  [/run\('npm', \['run', 'build'\]\)/, 'build verification missing'],
  [/\['diff', '--', 'src', 'public'\]/, 'product-source diff verification missing'],
  [/state\.failed/, 'durable failure state missing'],
]) if (!pattern.test(feature)) failures.push(message);
for (const [pattern, message] of [
  [/repository-index\.mjs/, 'fast executor does not refresh repository index'],
  [/repository-aware-fast-brain\.mjs/, 'fast executor does not invoke structured brain'],
]) if (!pattern.test(runner)) failures.push(message);
for (const [pattern, message] of [
  [/ls-files/, 'index must use Git file inventory'],
  [/dependencyEdges/, 'index must capture dependency edges'],
  [/sensitive/, 'index must exclude sensitive files'],
]) if (!pattern.test(index)) failures.push(message);
if (!/AUTOBOT_FEATURE_MAX_EDITS[^\n]*[=:]\s*[\"']?[1-3]/.test(workflow)) failures.push('workflow edit ceiling missing or unsafe');
if (!/LOCAL_AI_FEATURE_TIMEOUT_SECONDS[^\n]*[=:]\s*(12[0-9]|1[3-9][0-9]|2[0-9]{2}|300)/.test(workflow)) failures.push('workflow feature timeout missing or unsafe');
if (!/default:\s*[\"']?qwen3:4b[^\"']*[\"']?/.test(workflow)) failures.push('workflow must default to Qwen3 4B-compatible model');
if (!/repository-aware-fast-brain\.mjs/.test(workflow)) failures.push('workflow must include structured brain');
if (!/repository-aware-fast-executor\.mjs/.test(workflow)) failures.push('workflow must invoke fast executor');
if (!/git fetch --no-tags origin main/.test(workflow)) failures.push('checkpoint must fetch protected main');
if (!/git switch --detach origin\/main/.test(workflow)) failures.push('checkpoint must start from protected main');
if (!/git restore --source=origin\/main -- \.github\/workflows\//.test(workflow)) failures.push('checkpoint must restore workflow files from main');
if (!/git reset -- \.github\/workflows builder\/working/.test(workflow)) failures.push('checkpoint must exclude workflow and disposable state');
if (!/qwen3:4b/.test(installer)) failures.push('local brain installer must target Qwen3 4B-compatible model');
if (/qwen3:8b/.test(installer)) failures.push('local brain installer must not silently fall back to Qwen3 8B');
if (!/\\"think\\":false/.test(installer)) failures.push('local brain smoke test must explicitly disable thinking');
if (failures.length) {
  console.error('[autobot] fast-brain resilience FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] fast-brain resilience PASS');
