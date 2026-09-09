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
assert.ok(plan.cuts.length>=2, 'timeline refinement must retain at least the directed source coverage');
assert.equal(plan.directorSelection.length,plan.cuts.length);
assert.deepEqual(plan.directorSelection.map(item=>item.mediaId),plan.cuts.map(cut=>cut.mediaId));
assert.deepEqual(plan.directorSelection.map(item=>item.sourceIndex),plan.cuts.map(cut=>cut.sourceIndex));
assert.ok(plan.cuts.some(cut=>cut.mediaId==='action'),'directed action source must survive handoff');
assert.ok(plan.cuts.some(cut=>cut.mediaId==='hero'),'directed hero source must survive handoff');
assert.ok(plan.directorSelection.some(item=>item.mediaId==='action'&&item.score===94),'action director score and media identity must survive handoff');
assert.ok(plan.directorSelection.some(item=>item.mediaId==='hero'&&item.score===91),'hero director score and media identity must survive handoff');

console.log('director-v3-handoff-integrity: PASS');
