#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const engine=read('builder/runner/aider-feature-brain.mjs');
const planner=read('builder/runner/self-improvement-planner.mjs');
const objectives=JSON.parse(read('builder/brain/feature-objectives.json'));

for(const pattern of [/allowNewFiles/,/protectedPaths/,/assertScope/,/--no-auto-commits/,/--no-dirty-commits/,/--subtree-only/,/verifyDiff/,/verifyBuild/,/self-improvement/,/aider-feature-brain-learning\.json/,/recordFailure/,/recentLearning/])assert.match(engine,pattern,`missing self-improvement control: ${pattern}`);
assert.match(planner,/recurringFailures/,'learning planner must detect recurring failures');
assert.match(planner,/highestPriorityLearning/,'learning planner must produce a bounded learning focus');
const selfObjective=objectives.objectives.find(objective=>objective?.kind==='self-improvement');
assert.ok(selfObjective,'a self-improvement objective must exist');
assert.ok(Array.isArray(selfObjective.files)&&selfObjective.files.includes('builder/runner/aider-feature-brain.mjs'),'self-improvement must target the Aider engine explicitly');
assert.ok(Array.isArray(selfObjective.allowNewFiles)&&selfObjective.allowNewFiles.includes('builder/runner/self-improvement-planner.mjs'),'self-improvement must explicitly allow its planner file');
assert.ok(Array.isArray(selfObjective.protectedPaths)&&selfObjective.protectedPaths.length>0,'self-improvement must declare protected paths');
for(const required of ['builder/brain/feature-objectives.json','builder/quality/','.github/workflows/','package.json'])assert.ok(selfObjective.protectedPaths.includes(required),`protected path missing: ${required}`);
console.log('PASS: controlled self-improvement, learning feedback and protected boundary are present.');
