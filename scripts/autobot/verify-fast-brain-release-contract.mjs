#!/usr/bin/env node
/** Release contract for the canonical local-Qwen Fast Brain path. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');
const executor = read('builder/runner/repository-aware-fast-executor.mjs');
const brain = read('builder/runner/repository-aware-feature-brain.mjs');
const hardener = read('scripts/autobot/fast-brain-runtime-hardening.mjs');
const rollback = read('scripts/autobot/verify-fast-brain-rollback.mjs');
const harness = read('scripts/autobot/verify-fast-brain-agent-harness.mjs');
const liveSmoke = read('scripts/autobot/verify-fast-brain-live-qwen-smoke.mjs');
const installer = read('scripts/autobot/install-local-brain.sh');
const proxy = read('builder/runner/ollama-performance-proxy.mjs');
const taskLibrary = read('builder/brain/task-library.json');
const failures = [];
const require = (condition, message) => { if (!condition) failures.push(message); };
const MODEL = 'qwen3:4b-instruct-2507-q4_K_M';

require(workflow.includes(`LOCAL_AI_MODEL: ${MODEL}`), 'workflow is not hardwired to Qwen3 4B');
require(workflow.includes('node builder/runner/repository-aware-fast-executor.mjs'), 'workflow does not invoke canonical fast executor');
require(!workflow.includes('long-run-executor.mjs'), 'workflow still invokes retired long-run executor');
require(!workflow.match(/LOCAL_AI_MODEL:\s*qwen2\.5|gemini/i), 'workflow contains retired/non-local model reference');
require(workflow.includes('Verify checked-out revision'), 'workflow lacks exact checkout revision verification');
require(executor.includes(`REQUIRED_LOCAL_MODEL = '${MODEL}'`), 'executor is not hardwired to Qwen3 4B');
require(executor.includes('verifyRuntimeIdentity()'), 'executor lacks runtime identity verification');
require(executor.includes('features += 1'), 'executor does not record successful feature slices');
require(executor.includes('if (features === 0) process.exitCode = 1'), 'executor can silently succeed without a completed feature');
require(brain.includes(`REQUIRED_LOCAL_MODEL = '${MODEL}'`), 'feature brain is not hardwired to Qwen3 4B');
require(brain.includes('if (model !== REQUIRED_LOCAL_MODEL)'), 'feature brain does not reject model drift');

require(brain.includes("PROTOCOL = 'repository-aware-agent-v7'"), 'feature brain protocol is not repository-aware-agent-v7');
require(brain.includes('/api/chat'), 'feature brain does not use Ollama /api/chat');
require(brain.includes('stream: false'), 'Qwen chat is not non-streaming');
require(brain.includes('think: false'), 'Qwen thinking is not disabled');
require(brain.includes('tools'), 'Qwen tool definitions are missing');
require(brain.includes('response?.message?.tool_calls'), 'native Qwen tool-call handling is missing');
require(brain.includes('tool_name: call.name'), 'Ollama tool-result message contract is missing');
require(brain.includes('num_ctx: 4096'), 'feature brain context budget drifted');
require(brain.includes('num_predict: 900'), 'feature brain prediction budget drifted');
require(brain.includes('maxTurns'), 'bounded multi-turn execution is missing');
require(brain.includes('maxEdits'), 'bounded edit execution is missing');
require(brain.includes('edit rejected and rolled back'), 'feature brain lacks transactional edit rollback');
require(brain.includes('fs.writeFileSync(abs(file), current);'), 'feature brain lacks exact pre-edit restoration');
require(brain.includes('failedEditFiles'), 'feature brain lacks failed-file recovery');
require(brain.includes('Do NOT retry the same replacement.'), 'feature brain lacks failed-edit steering');
require(brain.includes('const completedIds = objectives.filter'), 'feature brain lacks durable completion state');
require(/progress\[objective\.id\]\s*=/.test(brain) && /saveState\(\)/.test(brain), 'feature brain lacks durable objective progress persistence');
require(brain.includes('if (completed === 0 && maxFeatures > 0) process.exitCode = 1;'), 'feature brain can silently succeed without completing an objective');

require(executor.includes('fast-brain-runtime-hardening.mjs'), 'executor does not run runtime hardening');
require(executor.includes('verify-fast-brain-rollback.mjs'), 'executor does not run rollback regression before Qwen');
require(rollback.includes('fs.copyFileSync(brainPath'), 'rollback regression is not tied to the active brain source');
require(rollback.includes('hardened === active'), 'rollback regression does not prove hardener idempotence');
require(hardener.includes('canonical feature brain recovery contract incomplete'), 'hardener does not validate canonical recovery contract');
require(hardener.includes('Do NOT retry the same replacement.'), 'hardener does not validate canonical failed-edit steering');
require(hardener.includes('npm run verify:batch33'), 'hardener does not recognize stale export migration');
require(hardener.includes('export-contract-check.mjs'), 'hardener does not repair/validate live export contract');

require(workflow.includes('node scripts/autobot/verify-fast-brain-agent-harness.mjs'), 'workflow does not run deterministic agent harness');
require(workflow.includes('node scripts/autobot/verify-fast-brain-live-qwen-smoke.mjs'), 'workflow does not run real Qwen code-building preflight');
for (const [source, label] of [[harness, 'deterministic harness'], [liveSmoke, 'live Qwen smoke']]) {
  require(source.includes('read_file'), `${label} lacks read_file`);
  require(source.includes('edit_file'), `${label} lacks edit_file`);
  require(source.includes('run_check') || source.includes('build'), `${label} lacks verification`);
  require(source.includes('src/'), `${label} does not operate on source code`);
}
require(harness.includes('failed syntax edit was not rolled back'), 'agent harness does not prove transactional rollback');
require(harness.includes('recovery edit on a different file was not applied'), 'agent harness does not prove failed-file recovery');
require(harness.includes('state.completed'), 'agent harness does not prove completion persistence');
require(liveSmoke.includes(`const model = '${MODEL}'`), 'live Qwen smoke is not hardwired to Qwen3 4B');
require(liveSmoke.includes('LOCAL_AI_READY'), 'live Qwen smoke does not enforce local-AI-only execution');
require(liveSmoke.includes('real source edit'), 'live Qwen smoke does not require a real source edit');
require(liveSmoke.includes('state.completed'), 'live Qwen smoke does not require durable completion');

require(installer.includes(`REQUIRED_MODEL='${MODEL}'`), 'installer is not hardwired to Qwen3 4B');
require(installer.includes('MODEL="${LOCAL_AI_MODEL:-$REQUIRED_MODEL}"'), 'installer default model expression drifted');
require(installer.includes('if [[ "$MODEL" != "$REQUIRED_MODEL" ]]'), 'installer does not reject model drift');
require(!installer.includes('qwen3:8b'), 'installer contains an unsafe Qwen3 8B fallback');
require(installer.includes('/api/chat'), 'installer smoke test does not use Ollama chat');
require(installer.includes('tool-call smoke failed'), 'installer lacks tool-call smoke test');
require(proxy.includes('request.stream = false'), 'proxy does not force non-streaming');
require(proxy.includes('request.think = false'), 'proxy does not force thinking off');
require(proxy.includes('temperature: 0'), 'proxy does not force deterministic temperature');
require(proxy.includes("req.url !== '/api/chat'"), 'proxy is not constrained to Ollama chat');

require(workflow.includes('LOCAL_AI_FEATURE_TIMEOUT_SECONDS=180'), 'feature timeout is not bounded at 180 seconds');
require(workflow.includes('AUTOBOT_FEATURE_MAX_EDITS=3'), 'edit ceiling is not 3');
require(workflow.includes('AUTOBOT_AGENT_TURNS=8'), 'agent turn ceiling is not 8');
require(workflow.includes('LOCAL_AI_PROXY_NUM_CTX=8192'), 'proxy context budget is not 8192');
require(workflow.includes('LOCAL_AI_PROXY_NUM_PREDICT=650'), 'proxy prediction budget is not 650');
require(workflow.includes('LOCAL_AI_PROXY_THINK=false'), 'proxy think flag is not false');
require(executor.includes('Math.min(10, Math.floor(left()))'), 'Qwen feature slice is not bounded to 10 minutes');

require(!taskLibrary.includes('npm run verify:batch33') || hardener.includes('npm run verify:batch33'), 'task library contains retired verify:batch33 without migration support');
require(taskLibrary.includes('export-profiles-and-validation'), 'task library is missing social-export objective');
require(taskLibrary.includes('export-contract-check.mjs') || hardener.includes('export-contract-check.mjs'), 'task library lacks live export contract check');
require(workflow.includes('git checkout -b "$branch"'), 'checkpoint branch creation is missing');
require(workflow.includes('gh pr create'), 'checkpoint PR publication is missing');
require(!workflow.match(/gh pr merge|git push origin main|vercel deploy/i), 'workflow contains automatic merge/deploy behaviour');

if (failures.length) {
  console.error('[autobot] Fast Brain release architecture contract FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] Fast Brain release architecture contract PASS: Qwen3 4B, canonical multi-turn tool agent, deterministic harness, real-Qwen code-building preflight, transactional recovery, idempotent hardening, exact checkout verification, native tool-call smoke, honest success metrics, and review-only checkpointing.');
