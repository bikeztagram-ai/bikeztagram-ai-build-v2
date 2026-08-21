/* BIKEZTAGRAM AI — zero-cost original music bridge.
   Lyria 3 is intentionally disabled in the current zero-spend build because Google's
   current Lyria 3 API is paid-only. No paid music-generation request is made.
*/
import { inferMusicStyle, buildSoundtrackBrief } from '../src/musicDirector.js';

function clamp(value,min,max){const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Method not allowed'});
  const {prompt='',duration=15,genre,mood,energy,bpm}=req.body||{};
  const requestedDuration=clamp(Number(duration)||15,5,180);
  const style=inferMusicStyle(prompt);
  const brief=buildSoundtrackBrief({prompt,duration:requestedDuration,genre:genre||style.genre,mood:mood||style.mood,energy:energy??style.energy,bpm:bpm||style.bpm});
  return res.status(200).json({success:true,source:'zero-cost-local-music',warning:'AI music generation is intentionally disabled in the zero-spend build. An original local soundtrack will be generated in the browser.',soundtrack:{...brief,audioAvailable:false,generationModel:'local-original-safety-fallback',generationMode:'procedural-original',paidAiMusicDisabled:true}});
}
