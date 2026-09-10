#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const engine=read('builder/runner/aider-feature-brain.mjs');
const controller=read('builder/runner/long-run-executor.mjs');
const planner=read('builder/runner/self-improvement-planner.mjs');
const workflow=read('.github/workflows/autobot-self-evolution.yml');
const fastWorkflow=read('.github/workflows/autonomous-builder-v2-fast.yml');
const policy=JSON.parse(read('builder/runner/autobot-evolution-policy.json'));
const objectives=JSON.parse(read('builder/brain/feature-objectives.json')).objectives||[];

assert.match(engine,/aider-repo-map-v7-bounded-learning/);
assert.match(engine,/AUTOBOT_FEATURE_FOCUS/);
assert.match(engine,/self-improvement/);
assert.match(engine,/recordFailure/);
assert.match(engine,/recentLearning/);
assert.match(engine,/configuredCallMax/);
assert.match(engine,/reserveMs/);
assert.match(engine,/qwen2\.5-coder:7b/);
assert.match(engine,/--no-auto-commits/);
assert.match(engine,/--no-dirty-commits/);
assert.match(engine,/--subtree-only/);
assert.match(engine,/no-progress/);
assert.match(engine,/rollbackAttempt/);
assert.match(engine,/verifyDiff/);
assert.match(engine,/verifyBuild/);
assert.match(engine,/validateObjective/);
assert.match(engine,/isRuntimeArtifact/);
assert.match(engine,/builder\/working\/autobot-audit\.jsonl/);
assert.match(engine,/builder\/working\/long-run-state\.json/);
assert.match(engine,/scopePrefix/);
assert.match(engine,/lastStatus/);
assert.match(controller,/selfImprovementOnly/);
assert.match(controller,/AUTOBOT_FEATURE_FOCUS/);
assert.match(controller,/featureCycles<maxFeatureCycles/);
assert.match(controller,/aider-repo-map-v7-bounded-learning/);
assert.match(controller,/self-evolution-objectives-exhausted/);
assert.match(controller,/consecutiveFeatureFailures/);
assert.match(controller,/maxFeatureFailures/);
assert.match(controller,/feature-brain-failure-stop/);
assert.match(controller,/qwen2\.5-coder:7b/);
assert.match(planner,/recurringFailures/);
assert.match(planner,/highestPriorityLearning/);
assert.match(planner,/recommendedNextAction/);
assert.match(planner,/timeoutFailures/);

assert.match(workflow,/LOCAL_AI_MODEL: qwen2\.5-coder:7b/);
assert.match(workflow,/AUTOBOT_AIDER_MODEL: ollama_chat\/qwen2\.5-coder:7b/);
assert.doesNotMatch(workflow,/inputs\.local_model/,'self-evolution model must not be user-overridable');
assert.match(workflow,/AUTOBOT_AIDER_CALL_TIMEOUT_MS: 900000/);
assert.match(workflow,/AUTOBOT_VERIFICATION_RESERVE_MS: 90000/);
assert.match(workflow,/AUTOBOT_FEATURE_PASSES_PER_SLICE=3/);
assert.match(workflow,/LOCAL_AI_PROXY_NUM_CTX=8192/);
assert.match(workflow,/LOCAL_AI_PROXY_NUM_PREDICT=1500/);
assert.match(workflow,/default: '30m'/);
assert.match(workflow,/AUTOBOT_FEATURE_FOCUS=self-improvement-only/);
assert.match(workflow,/AUTOBOT_SELF_EVOLUTION_REF: fix\/autobot-product-review-self-improvement-v2/);
assert.match(workflow,/AUTOBOT_MIN_SELF_EVOLUTION_SHA: 2af5489d6026e2cd89c9b7df1cbeef2b002c1669/);
assert.match(workflow,/actions\/upload-artifact@v4/);
assert.doesNotMatch(workflow,/gh pr create/);
assert.doesNotMatch(workflow,/git push/);
assert.doesNotMatch(workflow,/contents:\s*write/);

assert.match(fastWorkflow,/qwen2\.5-coder:3b/,'the separate fast product workflow may retain its lightweight 3B default');
assert.equal(policy.mode,'self-evolution-only');
assert.equal(policy.productWorkLocked,true);
const selfObjectives=objectives.filter(o=>o?.kind==='self-improvement');
assert.ok(selfObjectives.length>=4,'self-evolution needs a staged improvement backlog');
for(const selfObjective of selfObjectives){
  assert.ok(Array.isArray(selfObjective.files)&&selfObjective.files.length>0,`self-improvement objective ${selfObjective.id} needs a bounded file scope`);
  assert.ok(Array.isArray(selfObjective.protectedPaths)&&selfObjective.protectedPaths.length>0,`self-improvement objective ${selfObjective.id} needs protected paths`);
  assert.ok(selfObjective.acceptance.some(x=>String(x).includes('npm run build')),`self-improvement objective ${selfObjective.id} needs build verification`);
}
assert.ok(fs.existsSync(path.join(root,'scripts/autobot/verify-objective-paths.mjs')),'objective path verifier must exist');
console.log(`PASS: self-evolution runtime is bounded, adaptive, persistently learning, artifact-only and product-locked; 7B is hard-locked as the self-evolution model; ${selfObjectives.length} self-improvement objectives staged.`);
