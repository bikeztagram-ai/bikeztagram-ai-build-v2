#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const engine=read('builder/runner/aider-feature-brain.mjs');
const planner=read('builder/runner/self-improvement-planner.mjs');
const objectives=JSON.parse(read('builder/brain/feature-objectives.json'));

for(const pattern of [/allowNewFiles/,/protectedPaths/,/assertScope/,/--no-auto-commits/,/--no-dirty-commits/,/--subtree-only/,/verifyDiff/,/verifyBuild/,/self-improvement/,/aider-feature-brain-learning\.json/,/recordFailure/,/recentLearning/,/autobot-evolution-policy\.json/])assert.match(engine,pattern,`missing self-improvement control: ${pattern}`);
assert.match(planner,/recurringFailures/,'learning planner must detect recurring failures');
assert.match(planner,/highestPriorityLearning/,'learning planner must produce a bounded learning focus');
const selfObjectives=objectives.objectives.filter(objective=>objective?.kind==='self-improvement');
assert.ok(selfObjectives.length>=4,'a staged self-improvement backlog must exist');
for(const selfObjective of selfObjectives){
  assert.ok(Array.isArray(selfObjective.files)&&selfObjective.files.length>0,`${selfObjective.id} needs bounded files`);
  assert.ok(Array.isArray(selfObjective.protectedPaths)&&selfObjective.protectedPaths.length>0,`${selfObjective.id} needs protected paths`);
  for(const required of ['builder/brain/feature-objectives.json','builder/runner/autobot-evolution-policy.json','builder/quality/','.github/workflows/','package.json'])assert.ok(selfObjective.protectedPaths.includes(required),`${selfObjective.id} missing protected path: ${required}`);
}
const first=selfObjectives.find(o=>o.id==='autobot-self-performance');
assert.ok(first,'autobot-self-performance objective must exist');
assert.ok(first.files.includes('builder/runner/aider-feature-brain.mjs'),'self-performance must target the Aider engine explicitly');
assert.ok(first.allowNewFiles.includes('builder/runner/self-improvement-planner.mjs'),'self-performance must explicitly allow its planner file');
console.log('PASS: controlled self-improvement, staged learning feedback and hard protected boundaries are present.');
