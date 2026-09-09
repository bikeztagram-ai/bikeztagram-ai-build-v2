import assert from 'node:assert/strict';
import { buildDirectorRuntimeSelection } from '../src/directorRuntimeAdapter.js';
import { createAIEditPlan } from '../src/aiEditPlanner.js';

const analysis={
  durationInSeconds:12,
  sources:[
    {mediaIndex:0,name:'wide motorcycle',type:'video',durationInSeconds:18,subject:'vehicle'},
    {mediaIndex:1,name:'rider approach',type:'video',durationInSeconds:7,subject:'person'},
    {mediaIndex:2,name:'hero reveal',type:'image',durationInSeconds:4,subject:'vehicle'}
  ],
  bestMoments:[
    {mediaIndex:0,sourceIndex:0,score:88,cinematicScore:.9,motionScore:.8,visualQuality:{detail:.9,contrast:.9,sharpness:.9,composition:.9},start:2,end:8,duration:3},
    {mediaIndex:1,sourceIndex:1,score:76,cinematicScore:.8,motionScore:.7,visualQuality:{detail:.8,contrast:.8,sharpness:.8,composition:.8},start:1,end:6,duration:3},
    {mediaIndex:2,sourceIndex:2,score:96,cinematicScore:.98,motionScore:.2,visualQuality:{detail:.95,contrast:.95,sharpness:.95,composition:.95},duration:3}
  ]
};

const expectedSourceDurations=new Map([[0,18],[1,7],[2,4]]);
const runtime=buildDirectorRuntimeSelection(analysis,{creativePrompt:'cinematic motorcycle reveal with action',maxCuts:3});
assert.equal(runtime.selectedMoments.length,3);
assert.equal(runtime.analysis.aiEditPlan.cuts.length,3);
assert.ok(runtime.analysis.aiEditPlan.cuts.every(c=>c.shotDirection?.motion?.type));
assert.ok(runtime.analysis.aiEditPlan.cuts.every(c=>c.cameraIntent));
assert.deepEqual(new Set(runtime.analysis.aiEditPlan.cuts.map(c=>c.mediaIndex)),new Set(expectedSourceDurations.keys()));
assert.ok(runtime.analysis.aiEditPlan.cuts.every(c=>c.sourceDurationInSeconds===expectedSourceDurations.get(c.mediaIndex)));

const plan=createAIEditPlan(runtime.analysis,{creativePrompt:'cinematic motorcycle reveal with action',targetDuration:9,maxCuts:3});
assert.equal(plan.cuts.length,3);
assert.deepEqual(new Set(plan.cuts.map(c=>c.mediaIndex)),new Set(expectedSourceDurations.keys()));
assert.ok(plan.cuts.every(c=>c.sourceDurationInSeconds>0));
assert.ok(plan.cuts.every(c=>c.cameraIntent));
assert.ok(plan.cuts.every(c=>c.motionStyle));
assert.deepEqual(new Set(plan.directorSelection.map(c=>c.mediaIndex)),new Set(plan.cuts.map(c=>c.mediaIndex)));
console.log('Director V3 execution intent verification passed.');
