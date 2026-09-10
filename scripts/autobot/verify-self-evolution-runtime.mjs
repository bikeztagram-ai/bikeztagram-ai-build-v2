#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const engine=read('builder/runner/aider-feature-brain.mjs');
const controller=read('builder/runner/long-run-executor.mjs');
const planner=read('builder/runner/self-improvement-planner.mjs');
const policy=JSON.parse(read('builder/runner/autobot-evolution-policy.json'));
const objectives=JSON.parse(read('builder/brain/feature-objectives.json')).objectives||[];

assert.match(engine,/aider-repo-map-v5-learning/);
assert.match(engine,/AUTOBOT_FEATURE_FOCUS/);
assert.match(engine,/self-improvement/);
assert.match(engine,/recordFailure/);
assert.match(engine,/recentLearning/);
assert.match(engine,/--no-auto-commits/);
assert.match(engine,/--no-dirty-commits/);
assert.match(engine,/--subtree-only/);
assert.match(engine,/verifyDiff/);
assert.match(engine,/verifyBuild/);
assert.match(controller,/selfImprovementOnly/);
assert.match(controller,/AUTOBOT_FEATURE_FOCUS/);
assert.match(controller,/featureCycles<maxFeatureCycles/);
assert.match(planner,/recurringFailures/);
assert.match(planner,/highestPriorityLearning/);
assert.equal(policy.mode,'self-evolution-only');
assert.equal(policy.productWorkLocked,true);
const selfObjective=objectives.find(o=>o?.id==='autobot-self-improvement'&&o?.kind==='self-improvement');
assert.ok(selfObjective,'explicit self-improvement objective is required');
assert.ok(Array.isArray(selfObjective.files)&&selfObjective.files.length>0,'self-improvement objective needs a bounded file scope');
assert.ok(Array.isArray(selfObjective.protectedPaths)&&selfObjective.protectedPaths.length>0,'self-improvement objective needs protected paths');
console.log('PASS: self-evolution runtime contract is present and product work remains locked.');
