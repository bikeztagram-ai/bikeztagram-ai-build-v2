import assert from 'node:assert/strict';
import { buildProSongBlueprint } from '../src/proSongBlueprint.js';
import { createAIEditPlan } from '../src/aiEditPlanner.js';
import { buildScenePlan } from '../src/videoGenerationV2.js';
import { renderProject } from '../src/renderer.js';
import handler from '../api/render.js';

const b=buildProSongBlueprint({prompt:'original cinematic rock song',duration:90});
assert.equal(b.original,true); assert.ok(b.structure.length>=8); assert.ok(b.structure.some(s=>s.id==='chorus-1')); assert.ok(b.hook.identity.includes('original')); assert.match(b.copyrightGuard,/No imitation/);

const media=[
  {mediaIndex:0,description:'slow motorcycle reveal at sunset',duration:6},
  {mediaIndex:1,description:'fast motorcycle cornering action',duration:6},
  {mediaIndex:2,description:'hero close-up of the motorcycle',duration:6}
];
const calm=createAIEditPlan({mediaType:'video',durationInSeconds:18,subject:{label:'motorcycle'},bestMoments:media},{maxCuts:3,targetDuration:9,creativePrompt:'dark cinematic motorcycle reveal'});
const action=createAIEditPlan({mediaType:'video',durationInSeconds:18,subject:{label:'motorcycle'},bestMoments:media},{maxCuts:3,targetDuration:9,creativePrompt:'fast energetic motorcycle chase'});
assert.ok(calm.cuts.length>=3 && action.cuts.length>=3);
assert.notDeepEqual(calm.cuts.map(c=>c.transition),action.cuts.map(c=>c.transition),'creative briefs must materially affect edit decisions');

const scenePlan=buildScenePlan({brief:{duration:9,story:{hook:'mystery',build:'anticipation',reveal:'motorcycle reveal',escalation:'action',climax:'hero',outro:'brand ending'}},media,musicEvents:[{type:'drop',time:4.5}],subjectManifest:{subjects:[{id:'bike-1'}]}});
assert.equal(scenePlan.version,'scene-plan-v2');
assert.ok(scenePlan.slots.some(slot=>slot.role==='hook'));
assert.ok(scenePlan.slots.some(slot=>slot.role==='music-drop-insert'));
assert.deepEqual(scenePlan.subjectIds,['bike-1']);

// Exercise the production API scene-plan contract with a deterministic provider stub.
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({title:'API scene plan',cuts:[{mediaIndex:0,duration:1.5,purpose:'reveal',transition:'crossfade',motionStyle:'slow-push',speed:1}]})}]}}]}),{status:200,headers:{'content-type':'application/json'}});
process.env.GEMINI_API_KEY='batch90-test-key';
let apiStatus=0; let apiBody=null;
await handler({method:'POST',body:{prompt:'original cinematic motorcycle reveal',media:[{name:'motorcycle.mp4'}]}},{status(code){apiStatus=code;return this;},json(body){apiBody=body;return this;}});
globalThis.fetch=originalFetch;
assert.equal(apiStatus,200);
assert.equal(apiBody?.success,true);
assert.equal(apiBody?.plan?.cuts?.[0]?.purpose,'reveal');

// Exercise the actual renderer with a generated-only scene. This deterministic browser
// harness invokes the production renderer rather than a duplicate implementation.
let fakeNow=0;
const noop=()=>{};
const gradient=()=>({addColorStop:noop});
const ctx=new Proxy({canvas:{width:1080,height:1920}}, {get(target,key){
  if(key in target)return target[key];
  if(['createLinearGradient','createRadialGradient'].includes(key))return gradient;
  if(key==='measureText')return()=>({width:100});
  return noop;
},set(target,key,value){target[key]=value;return true;}});
const canvas={width:1080,height:1920,getContext:()=>ctx,captureStream:()=>({getTracks:()=>[]})};
globalThis.document={createElement:(tag)=>{if(tag==='canvas')return canvas; throw new Error(`Unexpected DOM element in generated-scene render: ${tag}`);}};
globalThis.MediaRecorder=class {
  static isTypeSupported(type){return type.startsWith('video/webm');}
  constructor(){this.state='inactive';this.ondataavailable=null;this.onstop=null;}
  start(){this.state='recording';}
  stop(){if(this.state==='inactive')return;this.state='inactive';this.ondataavailable?.({data:new Blob(['generated-render-frame'],{type:'video/webm'})});setTimeout(()=>this.onstop?.(),0);}
};
globalThis.requestAnimationFrame=(cb)=>setTimeout(()=>{fakeNow+=250;cb(fakeNow);},0);
globalThis.cancelAnimationFrame=(id)=>clearTimeout(id);
globalThis.performance={now:()=>fakeNow};
const generatedPlan={title:'Generated original world test',creativePrompt:'original cinematic neon motorcycle world',targetDuration:.5,cuts:[{mediaIndex:0,sourceType:'generated',generated:true,generationPrompt:'original neon motorcycle city at night',duration:.5,purpose:'hero',motionStyle:'slow-push',transition:'fade-in',colorGrade:'moody'}]};
const rendered=await renderProject([],generatedPlan,()=>{});
assert.ok(rendered instanceof Blob,'production renderer must return a Blob');
assert.ok(rendered.size>0,'production renderer must return non-empty output');

console.log('Professional song blueprint: PASS');
console.log('Batch-90 API -> scene-plan -> renderer integration: PASS');
console.log(`Renderer output bytes: ${rendered.size}`);
