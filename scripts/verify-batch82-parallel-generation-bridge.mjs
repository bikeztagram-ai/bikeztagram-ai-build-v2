import assert from 'node:assert/strict';
import { buildRendererPlanFromCreativeJob, materializeGeneratedScenesV2, materializeCreativeJobV2 } from '../src/creativeEngineMediaBridgeV2.js';

const job={title:'Parallel Film',targetDuration:15,style:{name:'cinematic',colorGrade:'dark-cinematic'},music:{genre:'cinematic-electronic',bpm:124,energy:.9},scenes:[
 {id:'a',sourceType:'uploaded',purpose:'opening',duration:2,mediaIndex:0},
 {id:'b',sourceType:'generated',purpose:'reveal',duration:3,generationPrompt:'original cinematic reveal'},
 {id:'c',sourceType:'generated',purpose:'action',duration:3,generationPrompt:'original cinematic action'}
]};
const plan=buildRendererPlanFromCreativeJob(job,{prompt:'test'});
assert.equal(plan.cuts.length,3);
assert.equal(plan.cuts.filter(c=>c.generated).length,2);

const started=[];let peak=0;let active=0;
const modelAdapter={generate:async()=>{}};
const fakeRuntime={};
void fakeRuntime;
// Inject a deterministic adapter through the runtime boundary by supplying a provider adapter object.
const adapter={
  generate:async(request)=>{started.push(request.timelineRole);active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;return {blob:new Blob(['x'],{type:'video/webm'}),mimeType:'video/webm',source:'test'};}
};
const generated=await materializeGeneratedScenesV2(job,{modelAdapter:adapter});
assert.equal(generated.length,2);
assert.deepEqual(generated.map(x=>x.sceneIndex),[1,2]);
assert.ok(peak>=2,'generated scenes should materialize in parallel');

const materialized=await materializeCreativeJobV2(job,{mediaItems:[{id:'uploaded-0',type:'video/mp4'}],modelAdapter:adapter});
assert.equal(materialized.execution.parallelGeneration,true);
assert.equal(materialized.execution.generatedCount,2);
assert.equal(materialized.plan.cuts.filter(c=>c.generated).length,2);
assert.equal(materialized.music.metadata.original,true);
console.log('Batch 82 parallel generation bridge: PASS');
console.log('- renderer contract preserved');
console.log('- generated scenes materialized concurrently');
console.log('- original in-house soundtrack retained');
console.log('- generated media mapped back into renderer timeline');
