import assert from 'node:assert/strict';
import { createAIEditPlan } from '../src/aiEditPlanner.js';
const analysis={durationInSeconds:20,subject:{description:'blue motorcycle'},bestMoments:[{mediaIndex:0,start:1,end:4,score:.99,description:'excellent opening ride'},{mediaIndex:0,start:6,end:9,score:.98,description:'strong cornering action'},{mediaIndex:1,start:10,end:13,score:.94,description:'wide scenic approach'},{mediaIndex:2,start:14,end:17,score:.93,description:'hero detail reveal'},{mediaIndex:3,start:18,end:20,score:.90,description:'final action pass'}]};
const plan=createAIEditPlan(analysis,{targetDuration:15,maxCuts:5,creativePrompt:'cinematic motorcycle action reveal'});
assert.ok(plan.cuts.length>=3);assert.ok(plan.cuts.length<=5);const exact=new Set(plan.cuts.map(c=>`${c.mediaIndex}:${Math.round(c.startTime*2)/2}`));assert.equal(exact.size,plan.cuts.length);assert.ok(new Set(plan.cuts.map(c=>c.mediaIndex)).size>=3);assert.ok(plan.cuts.some(c=>c.mediaIndex===2));assert.ok(plan.cuts.some(c=>c.mediaIndex===1));assert.ok(plan.qualityScore>=0&&plan.qualityScore<=100);
console.log('batch5-source-selection: PASS');
