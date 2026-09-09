#!/usr/bin/env node
/** Resilience contract for the active canonical repository-aware Qwen runtime. */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const feature = fs.readFileSync('builder/runner/repository-aware-feature-brain.mjs', 'utf8');
const runner = fs.readFileSync('builder/runner/repository-aware-fast-executor.mjs', 'utf8');
const hardening = fs.readFileSync('scripts/autobot/fast-brain-runtime-hardening.mjs', 'utf8');
const index = fs.readFileSync('builder/runner/repository-index.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml', 'utf8');
const installer = fs.readFileSync('scripts/autobot/install-local-brain.sh', 'utf8');
const failures = [];
const require = (condition, message) => { if (!condition) failures.push(message); };

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
  [/SUBMIT RECEIVED/, 'submit protocol missing'],
  [/edit rejected and rolled back/, 'transactional edit rollback missing'],
  [/fs\.writeFileSync\(abs\(file\), current\);/, 'exact pre-edit restoration missing'],
  [/failedEditFiles/, 'failed-file recovery missing'],
  [/Do NOT retry the same replacement\./, 'failed-edit steering missing'],
  [/progress\[objective\.id\]\s*=\s*(?:Math\.max|1)/, 'durable completion tracking missing'],
]) if (!pattern.test(feature)) failures.push(message);

for (const [pattern, message] of [
  [/repository-aware-feature-brain\.mjs/, 'fast executor does not invoke repository-aware Qwen agent'],
  [/fast-brain-runtime-hardening\.mjs/, 'fast executor does not apply runtime hardening'],
  [/verify-fast-brain-rollback\.mjs/, 'fast executor does not run rollback regression'],
  [/repository-index\.mjs/, 'fast executor does not refresh repository index'],
  [/BUILDER_MAX_MINUTES:\s*String\(Math\.max\(1, Math\.min\(10/, 'feature slice ceiling missing'],
]) if (!pattern.test(runner)) failures.push(message);

for (const [pattern, message] of [
  [/canonical feature brain recovery contract incomplete/, 'runtime hardening must validate the canonical brain'],
  [/Do NOT retry the same replacement\./, 'runtime hardening must validate canonical failed-edit steering'],
  [/npm run verify:batch33/, 'runtime hardening must recognize the stale export migration'],
  [/export-contract-check\.mjs/, 'export verification migration missing'],
]) if (!pattern.test(hardening)) failures.push(message);

for (const [pattern, message] of [
  [/ls-files/, 'index must use Git file inventory'],
  [/dependencyEdges/, 'index must capture dependency edges'],
  [/sensitive/, 'index must exclude sensitive files'],
]) if (!pattern.test(index)) failures.push(message);

require(/AUTOBOT_FEATURE_MAX_EDITS[^\n]*[=:]\s*["']?[1-3]/.test(workflow), 'workflow edit ceiling missing or unsafe');
require(/LOCAL_AI_FEATURE_TIMEOUT_SECONDS[^\n]*[=:]\s*(12[0-9]|1[3-9][0-9]|2[0-9]{2}|300)/.test(workflow), 'workflow feature timeout missing or unsafe');
require(/LOCAL_AI_MODEL:\s*qwen3:4b-instruct-2507-q4_K_M/.test(workflow), 'workflow must hardwire Qwen3 4B-compatible model');
const dispatchInputs = workflow.match(/\n  workflow_dispatch:\n([\s\S]*?)(?=\n(?:concurrency|permissions|env|jobs):)/)?.[1] ?? '';
require(!/^\s{6}LOCAL_AI_MODEL\s*:/m.test(dispatchInputs), 'workflow must not expose a selectable model input');
require(/repository-aware-fast-executor\.mjs/.test(workflow), 'workflow must invoke repository-aware fast executor');
require(/node scripts\/autobot\/verify-fast-brain-agent-harness\.mjs/.test(workflow), 'workflow must run deterministic agent harness before Qwen');
require(/git fetch --no-tags origin main/.test(workflow), 'checkpoint must fetch protected main');
require(/git switch --detach origin\/main/.test(workflow), 'checkpoint must start from protected main');
require(/git restore --source=origin\/main -- \.github\/workflows\//.test(workflow), 'checkpoint must restore workflow files from main');
require(/git reset -- \.github\/workflows builder\/working/.test(workflow), 'checkpoint must exclude workflow and disposable state');
require(/qwen3:4b/.test(installer), 'local brain installer must target Qwen3 4B-compatible model');
require(!/qwen3:8b/.test(installer), 'local brain installer must not silently fall back to Qwen3 8B');
require(/\\"think\\":false/.test(installer), 'local brain smoke test must explicitly disable thinking');

const regression = spawnSync(process.execPath, ['scripts/autobot/verify-fast-brain-rollback.mjs'], { encoding: 'utf8' });
if (regression.status !== 0) failures.push(`rollback regression test failed: ${(regression.stderr || regression.stdout || '').trim().slice(0, 1200)}`);

if (failures.length) {
  console.error('[autobot] fast-brain resilience FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] fast-brain resilience PASS: canonical Qwen brain, transactional recovery, idempotent hardening, deterministic harness, exact checkout and bounded runtime all verified.');
