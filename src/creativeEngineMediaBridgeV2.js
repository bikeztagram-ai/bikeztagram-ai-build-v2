/* Bridge Creative Engine plans into the existing renderer contract.
   Generated scene materialization is intentionally provider-neutral and parallel:
   one creative job can fan out to original music + multiple generated scenes, then
   return one renderer-ready media set. */
import { createOriginalCinematicWav } from './musicProviderV2.js';
import { createVideoGenerationRuntime } from './videoGenerationRuntimeV2.js';

const safeNumber=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const isGenerated=scene=>Boolean(scene?.generated||scene?.sourceType==='generated'||scene?.sourceType==='procedural'||scene?.generationPrompt);

export function buildRendererPlanFromCreativeJob(job,{prompt='',targetDuration=15}={}){
 const scenes=Array.isArray(job?.scenes)?job.scenes:[];
 const cuts=scenes.map((scene,i)=>({
  mediaIndex:Number.isInteger(Number(scene.mediaIndex))?Number(scene.mediaIndex):0,
  mediaId:scene.mediaId,
  sourceType:scene.sourceType||'uploaded',
  generated:isGenerated(scene),
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

export async function materializeGeneratedScenesV2(job,{onProgress,modelAdapter=null}={}){
 const scenes=Array.isArray(job?.scenes)?job.scenes:[];
 const requests=scenes.map((scene,sceneIndex)=>({scene,sceneIndex})).filter(({scene})=>isGenerated(scene));
 const total=requests.length;
 if(!total)return [];
 const runtime=createVideoGenerationRuntime({modelAdapter});
 let completed=0;
 const results=await Promise.all(requests.map(async ({scene,sceneIndex})=>{
   try{
     const result=await runtime.generate({
       type:scene.referenceAssets?.length?'image-to-video':'text-to-video',
       prompt:scene.generationPrompt||scene.prompt||scene.purpose||'',
       duration:scene.duration||4,
       aspectRatio:scene.aspectRatio||'9:16',
       referenceAssets:scene.referenceAssets||[],
       subjectIds:scene.subjectIds||[],
       camera:scene.camera||scene.motionStyle||'',
       motion:scene.motionStyle||'',
       lighting:scene.lighting||'',
       environment:scene.environment||'',
       timelineRole:scene.purpose||'generated scene'
     },{title:job?.title||'',onProgress:p=>onProgress?.({sceneIndex,sceneProgress:p,completed,total})});
     if(!result?.blob&&!result?.videoBlob&&!result?.videoUrl)throw new Error(`Generated scene ${sceneIndex+1} returned no media output.`);
     completed+=1;
     onProgress?.({sceneIndex,sceneProgress:100,completed,total});
     return {sceneIndex,blob:result.blob||result.videoBlob||null,url:result.url||result.videoUrl||'',sourceUrl:result.sourceUrl||result.url||result.videoUrl||'',sourceType:'generated',generated:true,mimeType:result.mimeType||result.blob?.type||result.videoBlob?.type||'video/webm',name:`generated-scene-${sceneIndex+1}.webm`,duration:result.duration||scene.duration||4,provider:result.source||'local-procedural',request:result.request};
   } catch(error){
     completed+=1;
     onProgress?.({sceneIndex,sceneProgress:100,completed,total,error:error?.message||String(error)});
     throw error;
   }
 }));
 return results.sort((a,b)=>a.sceneIndex-b.sceneIndex);
}

export function buildOriginalMusicForCreativeJob(job){
 const music=job?.music||{};const duration=safeNumber(job?.targetDuration,15);const bpm=safeNumber(music.bpm,112);const energy=safeNumber(music.energy,.78);return {audioBlob:createOriginalCinematicWav({seconds:duration,bpm,energy}),metadata:{original:true,provider:'in-house-procedural',bpm,duration,energy,genre:music.genre||'cinematic-electronic'}};
}

export async function materializeCreativeJobV2(job,context={}){
 const generated=await materializeGeneratedScenesV2(job,context);const plan=buildRendererPlanFromCreativeJob(job,context);const media=[...(context.mediaItems||[])];
 generated.forEach((item,i)=>media.push({...item,id:`generated-${i}`,file:null}));
 const generatedByScene=new Map(generated.map(item=>[item.sceneIndex,item]));
 plan.cuts=plan.cuts.map((cut,index)=>{const generatedItem=generatedByScene.get(index);if(!generatedItem)return cut;const generatedIndex=generated.findIndex(x=>x.sceneIndex===index);const mediaIndex=media.findIndex(item=>item?.id===`generated-${generatedIndex}`);return {...cut,mediaId:generatedItem.id,mediaIndex:mediaIndex>=0?mediaIndex:media.length-1,sourceType:'generated',generated:true,generationPrompt:cut.generationPrompt};});
 return {mediaItems:media,plan,music:buildOriginalMusicForCreativeJob(job),generatedScenes:generated,execution:{parallelGeneration:true,generatedCount:generated.length,uploadedCount:media.length-generated.length,readyForRenderer:true}};
}
