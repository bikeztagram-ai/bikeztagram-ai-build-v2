import assert from 'node:assert/strict';
import { buildRendererPlanFromCreativeJob } from '../src/creativeEngineMediaBridgeV2.js';

const job={title:'Identity routing test',targetDuration:12,style:{name:'cinematic',colorGrade:'dark-cinematic'},scenes:[
 {id:'hook-a',mediaIndex:0,purpose:'hook',duration:2,sourceType:'uploaded'},
 {id:'generated-reveal-b',purpose:'reveal',duration:3,sourceType:'generated',generationPrompt:'original reveal'},
 {id:'action-c',mediaIndex:1,purpose:'action',duration:4,sourceType:'uploaded'},
 {id:'generated-insert-d',purpose:'hero-insert',duration:3,sourceType:'generated',generationPrompt:'original hero insert'}
]};
const plan=buildRendererPlanFromCreativeJob(job,{prompt:'identity test',targetDuration:12});
assert.deepEqual(plan.cuts.map(c=>c.sceneId),['hook-a','generated-reveal-b','action-c','generated-insert-d']);
assert.deepEqual(plan.cuts.map(c=>c.timelineId),['hook-a','generated-reveal-b','action-c','generated-insert-d']);
console.log('Creative media identity V1: PASS');
