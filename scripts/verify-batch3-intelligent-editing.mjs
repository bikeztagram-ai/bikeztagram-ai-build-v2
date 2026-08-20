import assert from 'node:assert/strict';
import { refineCinematicTimeline, timelineSummary } from '../src/timelineDirector.js';
import { createAIEditPlan } from '../src/aiEditPlanner.js';

const analysis={durationInSeconds:18,subject:{description:'blue Kawasaki motorcycle'},bestMoments:[
 {mediaIndex:0,start:1,end:4,score:.96,description:'clean tracking ride'},
 {mediaIndex:1,start:5,end:8,score:.93,description:'wide scenic approach'},
 {mediaIndex:2,start:9,end:12,score:.91,description:'hero motorcycle detail'},
 {mediaIndex:3,start:13,end:16,score:.89,description:'cornering action'}
]};
const plan=createAIEditPlan(analysis,{targetDuration:15,creativePrompt:'cinematic motorcycle action reel'});
assert.ok(plan.cuts.length>=3);
assert.ok(plan.cuts.every(c=>c.duration>0&&c.startTime>=0));
assert.ok(plan.cuts.every(c=>c.motionIntensity<=.6));
assert.ok(plan.cuts.every(c=>!['whip-right','whip-left','flash-cut','zoom-punch'].includes(c.transition)));
const explicit=refineCinematicTimeline([
 {mediaIndex:0,startTime:1,duration:2,motionStyle:'static',transition:'hard-cut'},
 {mediaIndex:1,startTime:5,duration:2,motionStyle:'pan-right',transition:'hard-cut'},
 {mediaIndex:2,startTime:9,duration:2,motionStyle:'static',transition:'hard-cut'}
],{creativePrompt:'action cinematic'});
assert.equal(explicit[0].motionStyle,'static');
assert.equal(explicit[2].motionStyle,'static');
assert.ok(explicit.every(c=>!['whip-right','flash-cut','zoom-punch'].includes(c.transition)));
assert.ok(explicit.every(c=>c.motionIntensity<=.6));
assert.equal(timelineSummary(explicit).cuts,3);
console.log('Batch 3 intelligent-editing verification passed.');
