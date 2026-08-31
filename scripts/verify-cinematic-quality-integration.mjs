import assert from 'node:assert/strict';
import { createAIEditPlan } from '../src/aiEditPlanner.js';

const analysis={durationInSeconds:12,mediaType:'video',subject:{label:'motorcycle',category:'vehicle'},bestMoments:[
 {start:0,end:2,mediaIndex:0,description:'opening road movement',motionScore:.7,score:82},
 {start:2,end:5,mediaIndex:0,description:'fast motorcycle action',motionScore:.95,score:94},
 {start:5,end:8,mediaIndex:0,description:'cinematic reveal of motorcycle',motionScore:.4,score:91},
 {start:8,end:12,mediaIndex:0,description:'hero motorcycle sunset landscape',motionScore:.3,score:90}
]};
const plan=createAIEditPlan(analysis,{creativePrompt:'dark cinematic motorcycle action reveal',targetDuration:10,maxCuts:4});
assert.ok(plan.cinematicQuality);
assert.ok(Number.isFinite(plan.cinematicQuality.score));
assert.ok(['PASS','REVIEW','REJECT'].includes(plan.cinematicQuality.verdict));
assert.equal(plan.cinematicQuality.actualDuration,Number(plan.duration.toFixed(2)));
assert.equal(plan.cinematicQuality.targetDuration,10);
console.log(`Cinematic quality integration: PASS (${plan.cinematicQuality.score}/100)`);
