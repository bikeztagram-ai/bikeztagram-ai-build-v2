/* Music generation endpoint: provider-ready brief with zero-spend local fallback. */
import { inferMusicStyle, buildSoundtrackBrief } from '../src/musicDirector.js';
function clamp(value,min,max){const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({success:false,error:'Method not allowed'});
 const {prompt='',duration=15,genre,mood,energy,bpm}=req.body||{};
 const requestedDuration=clamp(duration,5,3600),style=inferMusicStyle(prompt),brief=buildSoundtrackBrief({prompt,duration:requestedDuration,genre:genre||style.genre,mood:mood||style.mood,energy:energy??style.energy,bpm:bpm||style.bpm});
 const longForm=requestedDuration>35;
 return res.status(200).json({success:true,source:'zero-cost-local-music',warning:'AI music generation remains disabled in the zero-spend build; this response is the provider-ready musical brief and local fallback contract.',soundtrack:{...brief,audioAvailable:false,generationModel:'provider-ready-local-safety-fallback',generationMode:longForm?'long-form-procedural-blueprint':'procedural-original',paidAiMusicDisabled:true,longForm,sectionDevelopment:longForm,providerContract:'music-provider-v2'}});
}
