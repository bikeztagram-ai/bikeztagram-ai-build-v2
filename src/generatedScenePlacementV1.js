import { buildGeneratedSceneContinuity, validateGeneratedSceneContinuity } from './generatedSceneContinuityV1.js';
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export function planGeneratedScenePlacement({scenes=[],musicEvents=[],media=[],subjectIds=[]}={}){
 const candidates=(Array.isArray(scenes)?scenes:[]).map((scene,index)=>{
  const previous=index>0?scenes[index-1]:null;
  const next=index<scenes.length-1?scenes[index+1]:null;
  const continuity=buildGeneratedSceneContinuity({subjectIds,previousShot:previous,nextShot:next,sceneBlueprint:scene});
  const beat=Array.isArray(musicEvents)?musicEvents.find(e=>Math.abs(n(e.time)-n(scene.start))<0.08):null;
  return {sceneId:scene.id||`scene-${index+1}`,start:n(scene.start),duration:n(scene.duration,2),role:scene.role||'insert',continuity,beatAligned:Boolean(beat),useRealMediaFirst:Array.isArray(media)&&media.length>0,decision:'generate'};
 });
 return {version:'generated-scene-placement-v1',candidates,maxGeneratedInserts:Math.min(4,candidates.length),strategy:'generate only where continuity and story value are sufficient'};
}
export function validateGeneratedScenePlacement(candidate,result){
 const continuity=validateGeneratedSceneContinuity(result,candidate?.continuity);
 if(!continuity.ok)return {ok:false,reason:continuity.reason};
 if(candidate?.beatAligned && result?.beatAligned!==true)return {ok:false,reason:'beat-alignment-not-confirmed'};
 if(result?.duration!=null && Math.abs(n(result.duration)-n(candidate.duration))>.5)return {ok:false,reason:'duration-mismatch'};
 return {ok:true};
}
