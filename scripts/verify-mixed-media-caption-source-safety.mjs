import assert from 'node:assert/strict';
import { applySpeechCaptionsToPlan } from '../src/captionPlanner.js';

const basePlan={cuts:[
  {mediaIndex:0,sourceIndex:0,startTime:0,duration:2,text:'existing-a'},
  {mediaIndex:1,sourceIndex:1,startTime:0,duration:2,text:'existing-b'},
]};
const cues=[{start:0,end:1.5,text:'hello from source 0',confidence:.95}];

const scoped=applySpeechCaptionsToPlan(basePlan,cues,{minimumConfidence:.55,sourceIndex:0});
assert.equal(scoped.appliedCount,1);
assert.equal(scoped.plan.cuts[0].text,'hello from source 0');
assert.equal(scoped.plan.cuts[0].captionSourceIndex,0);
assert.equal(scoped.plan.cuts[1].text,'existing-b');
assert.equal(scoped.plan.cuts[1].captionCueIndex,undefined);

const otherSource=applySpeechCaptionsToPlan(basePlan,[{start:0,end:1.5,text:'hello from source 1',confidence:.95}],{sourceIndex:1});
assert.equal(otherSource.appliedCount,1);
assert.equal(otherSource.plan.cuts[0].text,'existing-a');
assert.equal(otherSource.plan.cuts[1].text,'hello from source 1');
assert.equal(otherSource.plan.captioning.mode,'verified-source-scoped-speech-cues');

console.log('mixed-media-caption-source-safety: PASS');
