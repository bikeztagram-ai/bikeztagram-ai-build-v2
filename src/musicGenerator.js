/* BIKEZTAGRAM AI — browser-local original music generation facade. */
import { analyseAudioDataUrl } from './audioBeatAnalyzer.js';
import { createMusicBrief,composeFullMusic,renderMusicWav } from './musicStudioEngine.js';

function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Could not encode soundtrack.'));reader.readAsDataURL(blob);});}

export async function generateOriginalMusic({prompt='',duration=15,genre,mood,energy,bpm,key='auto',mode='auto',seed=''}={}){
  const brief=createMusicBrief({prompt,duration,bpm,key,mode,seed});
  if(genre)brief.genre=genre;
  if(mood)brief.mood=mood;
  if(energy)brief.energy=energy;
  const composition=composeFullMusic(brief);
  const blob=renderMusicWav(composition);
  const audioDataUrl=await blobToDataUrl(blob);
  let audioAnalysis=null;
  try{audioAnalysis=await analyseAudioDataUrl(audioDataUrl,{targetBpm:brief.bpm});}catch(error){audioAnalysis={analysis:'local-generated',warning:error?.message||'Beat analysis unavailable.'};}
  return{success:true,source:'browser-local-music-studio',soundtrack:{audioAvailable:true,audioMimeType:'audio/wav',audioDataUrl,bpm:brief.bpm,key:brief.key,mode:brief.mode,mood:brief.mood,genre:brief.genre,energy:brief.energy,generationModel:'browser-local-music-studio-v1',generationMode:'procedural-original',copyright:brief.copyright,composition,audioAnalysis,beatGrid:composition.beatGrid}};
}

export function planOriginalMusic(options={}){const brief=createMusicBrief(options);return composeFullMusic(brief);}
