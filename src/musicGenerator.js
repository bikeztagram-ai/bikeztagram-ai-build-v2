/* BIKEZTAGRAM AI — client-side music generation contract. */
import { analyseAudioDataUrl } from './audioBeatAnalyzer.js';
import { createOriginalPulseWav } from './musicProvider.js';
import { requestJson } from './apiRequest.js';

function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Could not encode fallback soundtrack.'));reader.readAsDataURL(blob);});}

async function buildLocalFallback({duration=15,bpm=112}={}){
  const seconds=Math.max(15,Math.min(30,Number(duration)||15));
  const blob=createOriginalPulseWav(seconds,bpm);
  const audioDataUrl=await blobToDataUrl(blob);
  let audioAnalysis;
  try{audioAnalysis=await analyseAudioDataUrl(audioDataUrl,{targetBpm:bpm});}catch(error){audioAnalysis={analysis:'planned-local-original',warning:error?.message||'Fallback audio analysis unavailable.'};}
  return {audioAvailable:true,audioMimeType:'audio/wav',audioDataUrl,bpm,beatGrid:audioAnalysis?.beatGrid||null,audioAnalysis,generationModel:'local-original-safety-fallback',generationMode:'procedural-original'};
}

export async function generateOriginalMusic({prompt='',duration=15,genre,mood,energy,bpm}={}){
  try{
    const {data}=await requestJson('/api/generate-music',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,duration,genre,mood,energy,bpm}),timeoutMs:120000},{attempts:3,baseDelayMs:900});
    if(!data?.success)throw new Error(data?.error||'Music generator returned an unsuccessful response.');
    if(data?.soundtrack?.audioAvailable&&data?.soundtrack?.audioDataUrl){try{data.soundtrack.audioAnalysis=await analyseAudioDataUrl(data.soundtrack.audioDataUrl,{targetBpm:data.soundtrack.bpm||bpm||120});}catch(error){data.soundtrack.audioAnalysis={analysis:'unavailable',warning:error?.message||'Actual audio analysis unavailable.'};}}
    if(data?.soundtrack?.audioAvailable&&data?.soundtrack?.audioDataUrl)return data;
    const fallback=await buildLocalFallback({duration,bpm:Number(data?.soundtrack?.bpm)||Number(bpm)||112});
    return {...data,source:'planning-plus-local-audio-fallback',warning:data?.warning||'AI music audio was unavailable; an original local safety soundtrack was generated so the render remains audible.',soundtrack:{...(data.soundtrack||{}),...fallback}};
  }catch(error){
    console.warn('[MUSIC] AI generation unavailable; using original local fallback.',error);
    const fallback=await buildLocalFallback({duration,bpm:Number(bpm)||112});
    return {success:true,source:'local-audio-fallback',warning:error?.message||'AI music generation unavailable; original local soundtrack used.',soundtrack:fallback};
  }
}
