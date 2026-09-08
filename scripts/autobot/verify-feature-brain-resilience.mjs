#!/usr/bin/env node
/** Resilience contract for the active repository-aware Qwen runtime. */
import fs from 'node:fs';

const feature = fs.readFileSync('builder/runner/repository-aware-feature-brain.mjs', 'utf8');
const runner = fs.readFileSync('builder/runner/repository-aware-fast-executor.mjs', 'utf8');
const hardening = fs.readFileSync('scripts/autobot/fast-brain-runtime-hardening.mjs', 'utf8');
const index = fs.readFileSync('builder/runner/repository-index.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml', 'utf8');
const installer = fs.readFileSync('scripts/autobot/install-local-brain.sh', 'utf8');
const failures = [];

for (const [pattern, message] of [
  [/function\s+dependenciesMet/, 'dependency-aware objective routing missing'],
  [/function\s+chooseObjective/, 'repository-aware objective selection missing'],
  [/objectiveContext\(/, 'objective-scoped source context missing'],
  [/\/api\/chat/, 'Ollama chat runtime missing'],
  [/stream:\s*false/, 'non-streaming chat response missing'],
  [/think:\s*false/, 'Qwen thinking must be disabled'],
  [/temperature:\s*0/, 'deterministic temperature missing'],
  [/num_ctx:\s*4096/, 'agent context budget missing'],
  [/num_predict:\s*900/, 'agent output budget missing'],
  [/AUTOBOT_AGENT_TURNS|const maxTurns/, 'bounded agent turns missing'],
  [/maxEdits|AUTOBOT_FEATURE_MAX_EDITS/, 'bounded edit budget missing'],
  [/exact search must match once/, 'exact-match write guard missing'],
  [/syntaxCheck\(/, 'syntax verification missing'],
  [/git', \['diff', '--', 'src', 'public'\]/, 'product-source diff verification missing'],
  [/state\.failed/, 'durable failure state missing'],
  [/snapshots/, 'objective rollback snapshot missing'],
  [/edit rejected and rolled back/, 'edit-level syntax rollback missing'],
  [/SUBMIT RECEIVED/, 'submit protocol missing'],
]) if (!pattern.test(feature)) failures.push(message);

for (const [pattern, message] of [
  [/repository-aware-feature-brain\.mjs/, 'fast executor does not invoke repository-aware Qwen agent'],
  [/fast-brain-runtime-hardening\.mjs/, 'fast executor does not apply runtime hardening'],
  [/repository-index\.mjs/, 'fast executor does not refresh repository index'],
  [/BUILDER_MAX_MINUTES: String\(Math\.max\(1, Math\.min\(10/, 'feature slice ceiling missing'],
]) if (!pattern.test(runner)) failures.push(message);

for (const [pattern, message] of [
  [/edit-level syntax rollback/, 'runtime hardening must describe edit rollback'],
  [/verify:batch33|export-contract-check\.mjs/, 'export verification repair missing'],
]) if (!pattern.test(hardening)) failures.push(message);

for (const [pattern, message] of [
  [/ls-files/, 'index must use Git file inventory'],
  [/dependencyEdges/, 'index must capture dependency edges'],
  [/sensitive/, 'index must exclude sensitive files'],
]) if (!pattern.test(index)) failures.push(message);

if (!/AUTOBOT_FEATURE_MAX_EDITS[^\n]*[=:]\s*[\"']?[1-3]/.test(workflow)) failures.push('workflow edit ceiling missing or unsafe');
if (!/LOCAL_AI_FEATURE_TIMEOUT_SECONDS[^\n]*[=:]\s*(12[0-9]|1[3-9][0-9]|2[0-9]{2}|300)/.test(workflow)) failures.push('workflow feature timeout missing or unsafe');
if (!/default:\s*[\"']?qwen3:4b[^\"']*[\"']?/.test(workflow)) failures.push('workflow must default to Qwen3 4B-compatible model');
if (!/repository-aware-fast-executor\.mjs/.test(workflow)) failures.push('workflow must invoke repository-aware fast executor');
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
