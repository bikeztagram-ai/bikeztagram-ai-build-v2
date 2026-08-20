/* BIKEZTAGRAM AI — client-side music generation contract. */
import { analyseAudioDataUrl } from './audioBeatAnalyzer.js';

export async function generateOriginalMusic({prompt='',duration=15,genre,mood,energy,bpm}={}){
  const response=await fetch('/api/generate-music',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,duration,genre,mood,energy,bpm})});
  const text=await response.text();
  let data;
  try{data=JSON.parse(text);}catch{throw new Error(`Music generator returned invalid JSON: ${text.slice(0,500)}`);}
  if(!response.ok||!data?.success)throw new Error(data?.error||`Music generator returned HTTP ${response.status}`);
  if(data?.soundtrack?.audioAvailable&&data?.soundtrack?.audioDataUrl){try{data.soundtrack.audioAnalysis=await analyseAudioDataUrl(data.soundtrack.audioDataUrl,{targetBpm:data.soundtrack.bpm||bpm||120});}catch(error){data.soundtrack.audioAnalysis={analysis:'unavailable',warning:error?.message||'Actual audio analysis unavailable.'};}}
  return data;
}
