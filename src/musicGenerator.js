/* BIKEZTAGRAM AI — client-side music generation contract. */
import { analyseAudioDataUrl } from './audioBeatAnalyzer.js';
import { createOriginalPulseWav } from './musicProvider.js';
import { requestJson } from './apiRequest.js';

function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Could not encode fallback soundtrack.'));reader.readAsDataURL(blob);});}

function resolveDuration(duration){
  const value=Number(duration);
  if(!Number.isFinite(value)||value<=0)return 15;
  return Math.max(5,Math.min(60,value));
}

function resolveBpm(bpm){
  const value=Number(bpm);
  if(!Number.isFinite(value)||value<=0)return 112;
  return Math.max(60,Math.min(180,Math.round(value)));
}

async function buildLocalFallback({duration=15,bpm=112}={}){
  const seconds=resolveDuration(duration);
  const resolvedBpm=resolveBpm(bpm);
  const blob=createOriginalPulseWav(seconds,resolvedBpm);
  const audioDataUrl=await blobToDataUrl(blob);
  let audioAnalysis;
  try{audioAnalysis=await analyseAudioDataUrl(audioDataUrl,{targetBpm:resolvedBpm});}catch(error){audioAnalysis={analysis:'planned-local-original',warning:error?.message||'Fallback audio analysis unavailable.'};}
  return {audioAvailable:true,audioMimeType:'audio/wav',audioDataUrl,bpm:resolvedBpm,durationSeconds:seconds,beatGrid:audioAnalysis?.beatGrid||null,audioAnalysis,generationModel:'local-original-safety-fallback',generationMode:'procedural-original'};
}

export async function generateOriginalMusic({prompt='',duration=15,genre,mood,energy,bpm}={}){
  const requestedDuration=resolveDuration(duration);
  const requestedBpm=resolveBpm(bpm);
  try{
    const {data}=await requestJson('/api/generate-music',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,duration:requestedDuration,genre,mood,energy,bpm:requestedBpm}),timeoutMs:120000},{attempts:3,baseDelayMs:900});
    if(!data?.success)throw new Error(data?.error||'Music generator returned an unsuccessful response.');
    if(data?.soundtrack?.audioAvailable&&data?.soundtrack?.audioDataUrl){try{data.soundtrack.audioAnalysis=await analyseAudioDataUrl(data.soundtrack.audioDataUrl,{targetBpm:data.soundtrack.bpm||requestedBpm||120});}catch(error){data.soundtrack.audioAnalysis={analysis:'unavailable',warning:error?.message||'Actual audio analysis unavailable.'};}}
    if(data?.soundtrack?.audioAvailable&&data?.soundtrack?.audioDataUrl)return data;
    const fallback=await buildLocalFallback({duration:requestedDuration,bpm:Number(data?.soundtrack?.bpm)||requestedBpm});
    return {...data,source:'planning-plus-local-audio-fallback',warning:data?.warning||'AI music audio was unavailable; an original local safety soundtrack was generated so the render remains audible.',soundtrack:{...(data.soundtrack||{}),...fallback}};
  }catch(error){
    console.warn('[MUSIC] AI generation unavailable; using original local fallback.',error);
    const fallback=await buildLocalFallback({duration:requestedDuration,bpm:requestedBpm});
    return {success:true,source:'local-audio-fallback',warning:error?.message||'AI music generation unavailable; original local soundtrack used.',soundtrack:fallback};
  }
}