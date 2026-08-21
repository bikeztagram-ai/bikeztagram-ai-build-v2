/* Bridge Creative Engine plans into the existing renderer contract. */
import { createOriginalCinematicWav } from './musicProviderV2.js';
import { generateProceduralSceneV2 } from './proceduralSceneGeneratorV2.js';

const safeNumber=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;

export function buildRendererPlanFromCreativeJob(job,{prompt='',targetDuration=15}={}){
 const scenes=Array.isArray(job?.scenes)?job.scenes:[];
 const cuts=scenes.map((scene,i)=>({
  mediaIndex:Number.isInteger(Number(scene.mediaIndex))?Number(scene.mediaIndex):0,
  mediaId:scene.mediaId,
  sourceType:scene.sourceType||'uploaded',
  generated:Boolean(scene.generated||scene.sourceType==='generated'||scene.sourceType==='procedural'),
  generationPrompt:scene.generationPrompt||scene.prompt||'',
  purpose:scene.purpose||scene.role||'cinematic-scene',
  startTime:safeNumber(scene.startTime,0),
  duration:safeNumber(scene.duration,Math.max(1,Number(targetDuration)/Math.max(1,scenes.length))),
  transition:scene.transitionIn||scene.transition||((i===0)?'fade-in':'hard-cut'),
  motionStyle:scene.motionStyle||'slow-push',
  motionIntensity:safeNumber(scene.motionIntensity,1),
  colorGrade:scene.colorGrade||job?.style?.colorGrade||'dark-cinematic',
  text:scene.text||''
 }));
 return {title:job?.title||'Creative Engine Film',style:job?.style?.name||'cinematic',creativePrompt:prompt,colorGrade:job?.style?.colorGrade||'dark-cinematic',targetDuration:safeNumber(job?.targetDuration,targetDuration),cuts,speechCaptions:job?.captions||[],captioning:job?.captioning||{enabled:false}};
}

export async function materializeGeneratedScenesV2(job,{onProgress}={}){
 const scenes=Array.isArray(job?.scenes)?job.scenes:[],generated=[];
 const total=scenes.filter(s=>s.generated||s.sourceType==='generated'||s.sourceType==='procedural'||s.generationPrompt).length;let completed=0;
 for(let i=0;i<scenes.length;i++){
  const scene=scenes[i],needs=Boolean(scene.generated||scene.sourceType==='generated'||scene.sourceType==='procedural'||scene.generationPrompt);if(!needs)continue;
  const result=await generateProceduralSceneV2({prompt:scene.generationPrompt||scene.prompt||scene.purpose||'',purpose:scene.purpose||'generated scene',duration:scene.duration||4,title:scene.text||'',onProgress:p=>onProgress?.({sceneIndex:i,sceneProgress:p,completed,total})});
  generated.push({sceneIndex:i,blob:result.blob,url:result.url,sourceUrl:result.url,sourceType:'generated',generated:true,mimeType:result.mimeType,name:`generated-scene-${i+1}.${result.mimeType.includes('webm')?'webm':'mp4'}`,duration:result.duration});completed++;onProgress?.({sceneIndex:i,sceneProgress:100,completed,total});
 }
 return generated;
}

export function buildOriginalMusicForCreativeJob(job){
 const music=job?.music||{};const duration=safeNumber(job?.targetDuration,15);const bpm=safeNumber(music.bpm,112);const energy=safeNumber(music.energy,.78);return {audioBlob:createOriginalCinematicWav({seconds:duration,bpm,energy}),metadata:{original:true,provider:'in-house-procedural',bpm,duration,energy,genre:music.genre||'cinematic-electronic'}};
}

export async function materializeCreativeJobV2(job,context={}){
 const generated=await materializeGeneratedScenesV2(job,context);const plan=buildRendererPlanFromCreativeJob(job,context);const media=[...(context.mediaItems||[])];
 generated.forEach((item,i)=>media.push({...item,id:`generated-${i}`,file:null}));
 const generatedByScene=new Map(generated.map(item=>[item.sceneIndex,item]));
 plan.cuts=plan.cuts.map((cut,index)=>{const generatedItem=generatedByScene.get(index);return generatedItem?{...cut,mediaId:generatedItem.id,mediaIndex:media.length-generated.length+generated.findIndex(x=>x.sceneIndex===index),sourceType:'generated',generated:true,generationPrompt:cut.generationPrompt}:cut;});
 return {mediaItems:media,plan,music:buildOriginalMusicForCreativeJob(job),generatedScenes:generated};
}
