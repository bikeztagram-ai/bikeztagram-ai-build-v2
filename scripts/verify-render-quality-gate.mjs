import assert from 'node:assert/strict';
import { inspectRenderPlan, assertRenderPlan } from '../src/renderQualityGate.js';
const media=[{type:'video/mp4',sourceUrl:'https://example.blob.vercel-storage.com/a.mp4'},{type:'video/mp4',sourceUrl:'https://example.blob.vercel-storage.com/b.mp4'}];
const good=[{mediaIndex:0,startTime:1,duration:2,role:'hook',motionStyle:'slow-push',motionIntensity:.35},{mediaIndex:1,startTime:4,duration:2.5,role:'peak',motionStyle:'pan-right',motionIntensity:.4},{mediaIndex:0,startTime:8,duration:2,role:'hero-ending',motionStyle:'static',motionIntensity:0}];
const result=inspectRenderPlan(good,media,{targetDuration:6.5});assert.equal(result.ready,true);assert.equal(result.cutCount,3);assert.equal(result.duplicateCount,0);assert.ok(result.durationDrift<.01);assert.equal(assertRenderPlan(good,media,{targetDuration:6.5}).ready,true);
const broken=inspectRenderPlan([{mediaIndex:9,startTime:0,duration:2}],media,{targetDuration:2});assert.equal(broken.ready,false);assert.equal(broken.issues.length,1);assert.throws(()=>assertRenderPlan([{mediaIndex:9,duration:2}],media));
const duplicate=inspectRenderPlan([{mediaIndex:0,startTime:2,duration:2,role:'hook'},{mediaIndex:0,startTime:2,duration:2},{mediaIndex:1,startTime:6,duration:2,role:'hero-ending'}],media,{targetDuration:6});assert.equal(duplicate.ready,true);assert.equal(duplicate.duplicateCount,1);assert.ok(duplicate.warnings.some((warning)=>warning.includes('exact source moments')));
const excessive=inspectRenderPlan([{mediaIndex:0,startTime:0,duration:2,motionIntensity:.9}],media,{targetDuration:2});assert.equal(excessive.ready,true);assert.ok(excessive.warnings.some((warning)=>warning.includes('excessive motion')));
console.log('render-quality-gate: PASS');
