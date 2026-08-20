import assert from 'node:assert/strict';
import { applySpeechCaptionsToPlan, normaliseSpeechCaptions } from '../src/captionPlanner.js';

const plan={targetDuration:6,cuts:[
  {sourceIndex:0,startTime:10,duration:2,purpose:'hook'},
  {sourceIndex:0,startTime:12,duration:2,purpose:'hero'}
]};
const cues=normaliseSpeechCaptions([
  {start:10.4,end:11.2,text:'Welcome to the ride',confidence:.96},
  {start:12.3,end:13.5,text:'This is the moment',confidence:.91},
  {start:14,end:15,text:'low confidence',confidence:.2}
]);
const applied=applySpeechCaptionsToPlan(plan,cues,{minimumConfidence:.55});
assert.equal(applied.captionCount,3);
assert.equal(applied.appliedCount,2);
assert.equal(applied.plan.cuts[0].captionCueIndex,0);
assert.equal(applied.plan.cuts[0].text,'Welcome to the ride');
assert.equal(applied.plan.cuts[0].textIn,.2);
assert.equal(applied.plan.cuts[0].textOut,.6);
assert.equal(applied.plan.cuts[1].captionCueIndex,1);
assert.equal(applied.plan.cuts[1].text,'This is the moment');
assert.equal(applied.plan.speechCaptions.length,3);
assert.equal(applied.plan.captioning.enabled,true);
assert.equal(applied.plan.cuts[0].startTime,10);
assert.equal(applied.plan.cuts[1].startTime,12);
console.log('batch37-caption-timeline: PASS');
