import assert from 'node:assert/strict';
import { buildRendererPlanFromCreativeJob, buildOriginalMusicForCreativeJob } from '../src/creativeEngineMediaBridgeV2.js';
import { createVideoGenerationRuntime } from '../src/videoGenerationRuntimeV2.js';
import { buildCreativeCommandPlan } from '../src/creativeDirectorV2.js';

const command=buildCreativeCommandPlan({
 prompt:'Create a dark cinematic motorcycle trailer with a reveal, action section and premium ending.',
 assets:[
  {id:'a',name:'bike-front.jpg',type:'image/jpeg',width:1920,height:1080},
  {id:'b',name:'ride.mp4',type:'video/mp4',duration:4.5,width:1920,height:1080}
 ],
 duration:15,
});
assert.equal(command.version,'creative-command-plan-v2','director command should be valid');
assert.ok(command.plan.generationRequests.length>=1,'director should be able to request generated inserts');

const job={
 title:'Motorcycle Trailer',
 targetDuration:15,
 style:{name:'cinematic',colorGrade:'dark-cinematic'},
 music:{genre:'cinematic-electronic',bpm:116,energy:.9},
 scenes:[
  {mediaIndex:0,purpose:'hook',duration:2,motionStyle:'slow-push',sourceType:'uploaded'},
  {purpose:'generated-establishing',duration:3,generated:true,generationPrompt:'neon night city road, cinematic motorcycle atmosphere'},
  {mediaIndex:1,purpose:'action',duration:4,sourceType:'uploaded',motionStyle:'pan-right'},
 ]
};
const plan=buildRendererPlanFromCreativeJob(job,{prompt:'motorcycle trailer',targetDuration:15});
assert.equal(plan.cuts.length,3);
assert.equal(plan.cuts[1].generated,true);
assert.equal(plan.cuts[1].sourceType,'generated');
assert.equal(plan.cuts[2].motionStyle,'pan-right');
assert.equal(plan.targetDuration,15);

const music=buildOriginalMusicForCreativeJob(job);
assert.equal(music.metadata.original,true);
assert.equal(music.metadata.bpm,116);
assert.ok(music.audioBlob?.size>1000,'music runtime should return WAV blob');

const fakeModel=async request=>({videoBlob:new Blob(['generated-video']),source:'test-model',request});
const videoRuntime=createVideoGenerationRuntime({modelAdapter:fakeModel,localGenerator:null});
const generated=await videoRuntime.generate({type:'text-to-video',prompt:'cinematic motorcycle insert',duration:2,timelineRole:'insert'});
assert.equal(generated.status,'ready');
assert.equal(generated.source,'test-model');
assert.equal(generated.request.constraints.originalOnly,true);
assert.equal(generated.request.timelineRole,'insert');
console.log('Creative Engine Runtime V2 verification passed:',{cuts:plan.cuts.length,generationRequests:command.plan.generationRequests.length,musicBytes:music.audioBlob.size,videoSource:generated.source});
