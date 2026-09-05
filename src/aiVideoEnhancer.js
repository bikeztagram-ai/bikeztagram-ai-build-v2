/* Universal creative runtime — turns eligible still-image cuts into real generated video. */
import { generateAIVideoScene } from './aiVideoProvider.js';

const DEFAULT_MAX_GENERATED_INSERTS=6;
const MAX_DATA_URI_BYTES=3200000;
const blobToDataUri=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Could not read image for AI video generation.'));reader.readAsDataURL(blob)});
async function prepareImageForRunway(file){
  if(!(file instanceof Blob))return'';
  if(file.size<=MAX_DATA_URI_BYTES)return blobToDataUri(file);
  try{const bitmap=await createImageBitmap(file);const maxSide=1600;const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();const resized=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));if(!resized||resized.size>MAX_DATA_URI_BYTES)return'';return blobToDataUri(resized)}catch{return''}
}
function ratioForPreset(preset='portrait'){return({portrait:'720:1280',story:'720:1280',square:'720:720',landscape:'1280:720',cinema:'1280:544'})[preset]||'720:1280'}
function cinematicPrompt({creativePrompt,cut}){const role=cut?.purpose||cut?.role||'cinematic shot';const motion=cut?.motionStyle||cut?.cameraMovement||'subtle natural camera movement';const subject=cut?.subject||'the main subject';const action=cut?.action||'natural believable movement';return[creativePrompt||'Create a premium cinematic film.',`Generate a real moving video shot for the ${role}.`,`Subject: ${subject}.`,`Action: ${action}.`,`Camera: ${motion}.`,'Preserve the identity and important visual attributes of the reference image.','Natural realistic motion, believable physics, cinematic lighting, premium commercial cinematography.','No text, logos, watermarks or unwanted subject changes.'].join(' ')}

export async function enhanceStillCutsWithAIVideo({mediaItems=[],plan,creativePrompt='',outputPreset='portrait',maxGeneratedInserts=DEFAULT_MAX_GENERATED_INSERTS,onProgress}={}){
  if(!Array.isArray(mediaItems)||!plan?.cuts?.length)return{mediaItems,generatedCount:0,provider:'none',attemptedCount:0};
  const next=mediaItems.map(item=>({...item}));const candidates=[];
  for(let i=0;i<plan.cuts.length;i+=1){const cut=plan.cuts[i];const index=Number(cut?.mediaIndex);const source=Number.isInteger(index)?next[index]:null;if(!source)continue;const file=source.file||source.blob;if(!(file instanceof Blob)||!String(file.type||'').startsWith('image/'))continue;candidates.push({cutIndex:i,mediaIndex:index,source,cut});if(candidates.length>=Math.max(1,Number(maxGeneratedInserts)||DEFAULT_MAX_GENERATED_INSERTS))break}
  if(!candidates.length)return{mediaItems:next,generatedCount:0,provider:'none',attemptedCount:0};
  let generatedCount=0,failedCount=0;
  for(let i=0;i<candidates.length;i+=1){const candidate=candidates[i];onProgress?.({stage:'ai-video',value:Math.round(i/candidates.length*100),current:i+1,total:candidates.length});const promptImage=await prepareImageForRunway(candidate.source.file||candidate.source.blob);if(!promptImage){failedCount++;continue}
    try{const generationPrompt=cinematicPrompt({creativePrompt,cut:candidate.cut});const requestedDuration=Number(candidate.cut?.duration);const duration=Number.isFinite(requestedDuration)?Math.max(2,Math.min(10,requestedDuration)):5;const result=await generateAIVideoScene({prompt:generationPrompt,duration,ratio:ratioForPreset(outputPreset),promptImage,onProgress:value=>onProgress?.({stage:'ai-video',value:Math.round((i+value/100)/candidates.length*100),current:i+1,total:candidates.length})});if(!result?.blob){failedCount++;continue}const url=URL.createObjectURL(result.blob);const generatedId=`generated-${Date.now()}-${candidate.cutIndex}-${generatedCount}`;next.push({id:generatedId,file:result.blob,blob:result.blob,url,sourceUrl:url,mimeType:result.blob.type||'video/mp4',type:result.blob.type||'video/mp4',sourceType:'generated',generated:true,generatedFrom:candidate.source.id||`source-${candidate.mediaIndex}`,provider:'Runway Gen-4.5',generationPrompt,generationCutIndex:candidate.cutIndex,generationMediaIndex:candidate.mediaIndex});candidate.cut.mediaId=generatedId;candidate.cut.generatedMediaId=generatedId;candidate.cut.generated=true;generatedCount++}
    catch(error){failedCount++;if(/not configured/i.test(error?.message||''))break;console.warn('[AI VIDEO] Still enhancement failed; keeping original source.',error)}
  }
  onProgress?.({stage:'ai-video',value:100,current:candidates.length,total:candidates.length,generatedCount,failedCount});return{mediaItems:next,generatedCount,failedCount,attemptedCount:candidates.length,provider:generatedCount?'Runway Gen-4.5':'none'};
}
