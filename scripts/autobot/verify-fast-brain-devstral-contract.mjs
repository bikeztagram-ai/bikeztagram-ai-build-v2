#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');
const executor = read('builder/runner/repository-aware-fast-executor.mjs');
const adapter = read('builder/runner/repository-aware-devstral-agent.mjs');
const installer = read('scripts/autobot/install-local-brain.sh');
const brain = read('builder/runner/repository-aware-feature-brain.mjs');
const performance = read('scripts/autobot/fast-brain-performance-hardening.mjs');
const failures = [];
const require = (condition, message) => { if (!condition) failures.push(message); };
const MODEL = 'devstral:24b';

require(workflow.includes(`LOCAL_AI_MODEL: ${MODEL}`), 'workflow is not hardwired to Devstral 24B');
require(workflow.includes('node scripts/autobot/verify-fast-brain-devstral-contract.mjs'), 'workflow does not run the Devstral contract');
require(workflow.includes('node builder/runner/repository-aware-fast-executor.mjs'), 'workflow does not invoke the canonical fast executor');
require(!workflow.includes('long-run-executor.mjs'), 'workflow still invokes the retired long-run executor');
require(!workflow.match(/LOCAL_AI_MODEL:\s*qwen2\.5|gemini/i), 'workflow contains a retired/non-local model reference');
require(workflow.includes('Verify checked-out revision'), 'workflow lacks exact checkout revision verification');
require(executor.includes(`REQUIRED_LOCAL_MODEL = '${MODEL}'`), 'executor is not hardwired to Devstral 24B');
require(executor.includes('repository-aware-devstral-agent.mjs'), 'executor does not use the isolated Devstral adapter');
require(executor.includes('verifyRuntimeIdentity()'), 'executor lacks runtime identity verification');
require(executor.includes('features += 1'), 'executor does not record successful feature slices');
require(executor.includes('if (features === 0) process.exitCode = 1'), 'executor can silently succeed without a completed feature');
require(adapter.includes(`const expected = '${MODEL}'`), 'adapter does not pin Devstral 24B');
require(adapter.includes('qwen3:4b-instruct-2507-q4_K_M'), 'adapter does not prove it is isolating the Qwen baseline');
require(adapter.includes('spawnSync(process.execPath'), 'adapter does not execute the isolated feature brain');
require(adapter.includes('finally'), 'adapter lacks temporary-file cleanup');
require(installer.includes(`REQUIRED_MODEL='${MODEL}'`), 'installer is not hardwired to Devstral 24B');
require(installer.includes('ollama pull'), 'installer does not pull the selected model');
require(installer.includes('tool-call smoke failed'), 'installer lacks tool-call smoke verification');
require(brain.includes("PROTOCOL = 'repository-aware-agent-v7'"), 'canonical brain protocol drifted');
require(brain.includes('edit rejected and rolled back'), 'canonical brain lost transactional rollback');
require(brain.includes('failedEditFiles'), 'canonical brain lost failed-file recovery');
require(performance.includes('Math.min(300, Math.max(60'), 'Devstral inference timeout is not restored to a realistic bound');
require(performance.includes('num_ctx: 4096, num_predict: 900'), 'Devstral generation contract is not the approved 4096/900 profile');
require(performance.includes("required: ['file', 'mode', 'search', 'replace']"), 'explicit edit mode contract is missing');
require(workflow.includes('LOCAL_AI_FEATURE_TIMEOUT_SECONDS=300'), 'workflow proxy timeout is not 300 seconds');
require(workflow.includes('LOCAL_AI_PROXY_NUM_CTX=8192'), 'proxy context budget is not 8192');
require(workflow.includes('LOCAL_AI_PROXY_NUM_PREDICT=900'), 'proxy prediction budget is not 900');
require(workflow.includes('LOCAL_AI_PROXY_THINK=false'), 'proxy think flag is not false');
require(!workflow.includes('verify-fast-brain-live-qwen-smoke.mjs'), 'workflow still invokes the Qwen-specific live smoke');
require(workflow.includes('git checkout -b "$branch"'), 'checkpoint branch creation is missing');
require(workflow.includes('gh pr create'), 'checkpoint PR publication is missing');
require(!workflow.match(/gh pr merge|git push origin main|vercel deploy/i), 'workflow contains automatic merge/deploy behaviour');

if (failures.length) {
  console.error('[autobot] Fast Brain Devstral experimental contract FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] Fast Brain Devstral experimental contract PASS: isolated Devstral 24B model path, canonical safety/edit/rollback machinery retained, bounded inference, real feature executor, exact checkout verification, and review-only checkpointing.');
