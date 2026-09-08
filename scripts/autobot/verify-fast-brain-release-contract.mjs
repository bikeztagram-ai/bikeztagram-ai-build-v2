#!/usr/bin/env node
/**
 * Release contract for the canonical local-Qwen Fast Brain path.
 *
 * Cross-file audit: changing one component of the builder must not silently
 * leave another component on a retired architecture.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');
const executor = read('builder/runner/repository-aware-fast-executor.mjs');
const brain = read('builder/runner/repository-aware-feature-brain.mjs');
const hardener = read('scripts/autobot/fast-brain-runtime-hardening.mjs');
const rollback = read('scripts/autobot/verify-fast-brain-rollback.mjs');
const failures = [];
const require = (condition, message) => { if (!condition) failures.push(message); };

// Canonical runtime identity.
require(workflow.includes('LOCAL_AI_MODEL: qwen3:4b-instruct-2507-q4_K_M'), 'workflow is not hardwired to Qwen3 4B');
require(workflow.includes('node builder/runner/repository-aware-fast-executor.mjs'), 'workflow does not invoke the canonical repository-aware fast executor');
require(!workflow.includes('long-run-executor.mjs'), 'workflow still invokes retired long-run executor');
require(!workflow.match(/LOCAL_AI_MODEL:\s*qwen2\.5|gemini/i), 'workflow contains a retired/non-local model reference');
require(workflow.includes('Verify checked-out revision'), 'workflow lacks exact checkout revision verification');

// Proven multi-turn Qwen contract.
require(brain.includes("PROTOCOL = 'repository-aware-agent-v7'"), 'feature brain protocol is not repository-aware-agent-v7');
require(brain.includes("'/api/chat'"), 'feature brain does not use Ollama /api/chat');
require(brain.includes('stream: false'), 'Qwen chat is not non-streaming');
require(brain.includes('think: false'), 'Qwen thinking is not disabled for the fast path');
require(brain.includes('tools'), 'Qwen tool definitions are missing');
require(brain.includes('response?.message?.tool_calls'), 'native Qwen tool-call handling is missing');
require(brain.includes('tool_name: call.name'), 'Ollama tool-result message contract is missing');
require(brain.includes('num_ctx: 4096'), 'feature brain context budget drifted from the proven agent contract');
require(brain.includes('num_predict: 900'), 'feature brain prediction budget drifted from the proven agent contract');
require(brain.includes('maxTurns'), 'bounded multi-turn execution is missing');
require(brain.includes('maxEdits'), 'bounded edit execution is missing');

// Safety/recovery contract must exist in source or be installed and tested before Qwen runs.
require(hardener.includes('edit rejected and rolled back'), 'runtime hardener lacks transactional edit rollback');
require(hardener.includes('completed: completedIds'), 'runtime hardener lacks durable completion state');
require(hardener.includes('failedEditFiles'), 'runtime hardener lacks failed-file recovery');
require(hardener.includes('Do NOT repeat the same replacement.'), 'runtime hardener lacks failed-edit steering');
require(executor.includes('fast-brain-runtime-hardening.mjs'), 'executor does not install runtime hardening before Qwen');
require(executor.includes('verify-fast-brain-rollback.mjs'), 'executor does not run rollback regression before Qwen');
require(rollback.includes('actual active brain as the fixture'), 'rollback regression is not tied to the active source');

// Operational bounds.
require(workflow.includes('LOCAL_AI_FEATURE_TIMEOUT_SECONDS=180'), 'feature timeout is not bounded at 180 seconds');
require(workflow.includes('AUTOBOT_FEATURE_MAX_EDITS=3'), 'edit ceiling is not 3');
require(workflow.includes('AUTOBOT_AGENT_TURNS=8'), 'agent turn ceiling is not 8');
require(workflow.includes('LOCAL_AI_PROXY_NUM_CTX=8192'), 'proxy context budget is not 8192');
require(workflow.includes('LOCAL_AI_PROXY_NUM_PREDICT=650'), 'proxy prediction budget is not 650');
require(workflow.includes('LOCAL_AI_PROXY_THINK=false'), 'proxy think flag is not false');
require(executor.includes('Math.min(10, Math.floor(left()))'), 'Qwen feature slice is not bounded to 10 minutes');

// Guard against stale generated acceptance commands.
const taskLibrary = read('builder/brain/task-library.json');
require(!taskLibrary.includes('npm run verify:batch33'), 'task library still contains retired verify:batch33 command');
require(taskLibrary.includes('export-contract-check.mjs'), 'task library lacks the live export contract check');

// Workflow must remain review-only and never auto-merge/deploy.
require(workflow.includes('git checkout -b "$branch"'), 'checkpoint branch creation is missing');
require(workflow.includes('gh pr create'), 'checkpoint PR publication is missing');
require(!workflow.match(/gh pr merge|git push origin main|vercel deploy/i), 'workflow contains automatic merge/deploy behaviour');

if (failures.length) {
  console.error('[autobot] Fast Brain release architecture contract FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] Fast Brain release architecture contract PASS: one canonical Qwen3 4B path, multi-turn tool agent, transactional recovery, bounded execution, exact checkout verification, and review-only checkpointing.');
