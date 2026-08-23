/* BIKEZTAGRAM AI — client-side original soundtrack generation. */
import { analyseAudioDataUrl } from './audioBeatAnalyzer.js';
import { createOriginalMusicWav } from './musicProvider.js';
import { requestJson } from './apiRequest.js';

function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Could not encode fallback soundtrack.'));reader.readAsDataURL(blob);});}

async function buildLocalFallback({duration=15,bpm=112,genre='cinematic',mood='cinematic',energy=.72,prompt=''}={}){
  const seconds=Math.max(15,Math.min(30,Number(duration)||15));
  const blob=createOriginalMusicWav(seconds,bpm,{genre,mood,energy,seed:`${genre}:${mood}:${prompt}`});
  const audioDataUrl=await blobToDataUrl(blob);
  let audioAnalysis;
  try{audioAnalysis=await analyseAudioDataUrl(audioDataUrl,{targetBpm:bpm});}catch(error){audioAnalysis={analysis:'planned-local-original',warning:error?.message||'Fallback audio analysis unavailable.'};}
  return {audioAvailable:true,audioMimeType:'audio/wav',audioDataUrl,bpm,beatGrid:audioAnalysis?.beatGrid||null,audioAnalysis,generationModel:'local-original-musical-engine-v2',generationMode:'procedural-original-arrangement',genre,mood,energy};
}

export async function generateOriginalMusic({prompt='',duration=15,genre,mood,energy,bpm}={}){
  try{
    const {data}=await requestJson('/api/generate-music',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,duration,genre,mood,energy,bpm}),timeoutMs:120000},{attempts:3,baseDelayMs:900});
    if(!data?.success)throw new Error(data?.error||'Music generator returned an unsuccessful response.');
    if(data?.soundtrack?.audioAvailable&&data?.soundtrack?.audioDataUrl){try{data.soundtrack.audioAnalysis=await analyseAudioDataUrl(data.soundtrack.audioDataUrl,{targetBpm:data.soundtrack.bpm||bpm||120});}catch(error){data.soundtrack.audioAnalysis={analysis:'unavailable',warning:error?.message||'Actual audio analysis unavailable.'};}}
    if(data?.soundtrack?.audioAvailable&&data?.soundtrack?.audioDataUrl)return data;
    const fallback=await buildLocalFallback({duration,bpm:Number(data?.soundtrack?.bpm)||Number(bpm)||112,genre:data?.soundtrack?.genre||genre||'cinematic',mood:data?.soundtrack?.mood||mood||'cinematic',energy:data?.soundtrack?.energy??energy??.72,prompt});
    return {...data,source:'planning-plus-local-audio-fallback',warning:data?.warning||'AI music audio was unavailable; an original local musical arrangement was generated so the render remains audible.',soundtrack:{...(data.soundtrack||{}),...fallback}};
  }catch(error){
    console.warn('[MUSIC] AI generation unavailable; using original local musical fallback.',error);
    const fallback=await buildLocalFallback({duration,bpm:Number(bpm)||112,genre:genre||'cinematic',mood:mood||'cinematic',energy:energy??.72,prompt});
    return {success:true,source:'local-audio-fallback',warning:error?.message||'AI music generation unavailable; original local musical soundtrack used.',soundtrack:fallback};
  }
}
