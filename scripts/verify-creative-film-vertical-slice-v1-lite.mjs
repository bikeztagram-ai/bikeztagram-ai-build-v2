import assert from 'node:assert/strict';
import { buildCreativeCommandPlan } from '../src/creativeDirectorV2.js';
import { buildRendererPlanFromCreativeJob, buildOriginalMusicForCreativeJob } from '../src/creativeEngineMediaBridgeV2.js';
const input={prompt:'Create a dark cinematic motorcycle trailer with anticipation, reveal, action and a powerful hero ending.',duration:15,aspectRatio:'9:16',assets:[{id:'bike',name:'bike.jpg',type:'image/jpeg',subjectId:'bike',subjectType:'motorcycle'},{id:'ride',name:'ride.mp4',type:'video/mp4',duration:5,subjectId:'bike',subjectType:'motorcycle'}]};
const command=buildCreativeCommandPlan(input);assert.ok(command?.plan?.generationRequests?.length>=1);
const job={title:'AI Film',targetDuration:15,style:{name:'cinematic',colorGrade:'dark-cinematic'},music:{genre:'cinematic-electronic',bpm:116,energy:.9},scenes:[{mediaIndex:0,purpose:'hook',duration:2,sourceType:'uploaded'},{purpose:'reveal-insert',duration:3,generated:true,generationPrompt:'original cinematic motorcycle reveal environment'},{mediaIndex:1,purpose:'action',duration:5,sourceType:'uploaded'},{mediaIndex:0,purpose:'hero',duration:3,sourceType:'uploaded'}]};
const rendererPlan=buildRendererPlanFromCreativeJob(job,{prompt:input.prompt,targetDuration:15});assert.equal(rendererPlan.cuts.length,4);assert.ok(rendererPlan.cuts.some(c=>c.generated));
const music=buildOriginalMusicForCreativeJob(job);assert.equal(music.metadata.original,true);assert.ok(music.audioBlob?.size>1000);
console.log('Creative film vertical slice V1-lite: PASS',{generationRequests:command.plan.generationRequests.length,cuts:rendererPlan.cuts.length,musicBytes:music.audioBlob.size});
