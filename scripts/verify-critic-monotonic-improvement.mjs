import assert from 'node:assert/strict';
import { critiqueAndImproveTimeline } from '../src/editCritic.js';
const weak=[
 {mediaIndex:0,startTime:0,duration:7,role:'story-beat',motionStyle:'static',transition:'hard-cut'},
 {mediaIndex:0,startTime:7,duration:7,role:'story-beat',motionStyle:'static',transition:'hard-cut'},
 {mediaIndex:0,startTime:14,duration:7,role:'story-beat',motionStyle:'static',transition:'hard-cut'}
];
const result=critiqueAndImproveTimeline(weak,{flags:{action:true}});
assert.equal(result.changed,true);
assert.ok(result.after.score>=result.before.score,`critic regressed ${result.before.score} -> ${result.after.score}`);
assert.equal(result.cuts[0].role,'hook');
assert.equal(result.cuts.at(-1).role,'hero-ending');
assert.ok(result.cuts.every(c=>c.motionStyle&&c.motionStyle!=='static'));
assert.ok(result.cuts.every(c=>Number(c.speedEnd)>=.5));
console.log(`Critic monotonic-improvement contract: PASS (${result.before.score} -> ${result.after.score})`);
