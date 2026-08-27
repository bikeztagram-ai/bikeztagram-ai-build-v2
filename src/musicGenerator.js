/* BIKEZTAGRAM AI — client-side music generation contract. */
import { analyseAudioDataUrl } from './audioBeatAnalyzer.js';
import { createOriginalPulseWav } from './musicProvider.js';
import { requestJson } from './apiRequest.js';
import { buildSoundtrackBrief } from './musicDirector.js';

function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Could not encode fallback soundtrack.'));reader.readAsDataURL(blob);});}

async function buildLocalFallback({duration=15,bpm=112,brief}={}){
  const seconds=Math.max(5,Math.min(60,Number(duration)||15));
  const safeBpm=Math.max(60,Math.min(180,Number(bpm)||112));
  const blob=createOriginalPulseWav(seconds,safeBpm);
  const audioDataUrl=await blobToDataUrl(blob);
  let audioAnalysis;
  try{audioAnalysis=await analyseAudioDataUrl(audioDataUrl,{targetBpm:safeBpm});}catch(error){audioAnalysis={analysis:'planned-local-original',warning:error?.message||'Fallback audio analysis unavailable.'};}
  return {audioAvailable:true,audioMimeType:'audio/wav',audioDataUrl,bpm:safeBpm,beatGrid:audioAnalysis?.beatGrid||brief?.beatGrid||null,audioAnalysis,generationModel:'local-original-safety-fallback',generationMode:'procedural-original'};
}

export async function generateOriginalMusic({prompt='',duration=15,genre,mood,energy,bpm}={}){
  const direction=buildSoundtrackBrief({prompt,duration,genre,mood,energy,bpm});
  const request={prompt,duration:direction.duration,genre:direction.genre,mood:direction.mood,energy:direction.energy,bpm:direction.bpm};
  try{
    const {data}=await requestJson('/api/generate-music',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),timeoutMs:120000},{attempts:3,baseDelayMs:900});
    if(!data?.success)throw new Error(data?.error||'Music generator returned an unsuccessful response.');
    if(data?.soundtrack?.audioAvailable&&data?.soundtrack?.audioDataUrl){try{data.soundtrack.audioAnalysis=await analyseAudioDataUrl(data.soundtrack.audioDataUrl,{targetBpm:data.soundtrack.bpm||direction.bpm});}catch(error){data.soundtrack.audioAnalysis={analysis:'unavailable',warning:error?.message||'Actual audio analysis unavailable.'};}}
    if(data?.soundtrack?.audioAvailable&&data?.soundtrack?.audioDataUrl)return {...data,direction,brief:direction};
    const fallback=await buildLocalFallback({duration:direction.duration,bpm:Number(data?.soundtrack?.bpm)||direction.bpm,brief:direction});
    return {...data,source:'planning-plus-local-audio-fallback',warning:data?.warning||'AI music audio was unavailable; an original local safety soundtrack was generated so the render remains audible.',soundtrack:{...(data.soundtrack||{}),...fallback},direction,brief:direction};
  }catch(error){
    console.warn('[MUSIC] AI generation unavailable; using original local fallback.',error);
    const fallback=await buildLocalFallback({duration:direction.duration,bpm:direction.bpm,brief:direction});
    return {success:true,source:'local-audio-fallback',warning:error?.message||'AI music generation unavailable; original local soundtrack used.',soundtrack:fallback,direction,brief:direction};
  }
}
