import assert from 'node:assert/strict';
import { createAIEditPlan } from '../src/aiEditPlanner.js';

const analysis={
  durationInSeconds:12,
  subject:{label:'motorcycle'},
  mediaType:'mixed-media',
  bestMoments:[
    {mediaIndex:0,sourceIndex:0,mediaId:'wide',score:80,description:'wide mountain road'},
    {mediaIndex:1,sourceIndex:1,mediaId:'action',score:96,description:'motorcycle accelerating cornering',motionScore:.95},
    {mediaIndex:2,sourceIndex:2,mediaId:'hero',score:92,description:'hero motorcycle reveal detail'}
  ],
  aiEditPlan:{
    cuts:[
      {momentIndex:1,mediaIndex:1,sourceIndex:1,mediaId:'action',editorialRole:'action',directorSelectionScore:94,directorFamily:'action'},
      {momentIndex:2,mediaIndex:2,sourceIndex:2,mediaId:'hero',editorialRole:'hero-ending',directorSelectionScore:91,directorFamily:'hero'}
    ]
  }
};

const plan=createAIEditPlan(analysis,{creativePrompt:'fast cinematic motorcycle reveal',targetDuration:8,maxCuts:2});
assert.equal(plan.cuts.length,2);
assert.deepEqual(plan.cuts.map(cut=>cut.mediaId),['action','hero']);
assert.deepEqual(plan.directorSelection.map(item=>item.mediaId),['action','hero']);
assert.deepEqual(plan.directorSelection.map(item=>item.sourceIndex),[1,2]);
assert.deepEqual(plan.directorSelection.map(item=>item.score),[94,91]);
assert.ok(plan.directorSelection.every(item=>item.mediaId));

console.log('director-v3-handoff-integrity: PASS');
