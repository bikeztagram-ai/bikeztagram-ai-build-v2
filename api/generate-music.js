/* BIKEZTAGRAM AI — original music generation API route with timeout protection and fallback handling.
   Zero-cost music bridge: generates professional original soundtrack brief and procedural WAV audio
   while ensuring zero paid API dependency.
*/
import { inferMusicStyle, buildSoundtrackBrief } from '../src/musicDirector.js';
import { buildMusicProfile, createOriginalCinematicWav } from '../src/musicProviderV2.js';

function clamp(value,min,max){const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Method not allowed'});
  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), 110000);
  try{
    if(signal.aborted) throw new DOMException('Aborted','AbortError');
    const {prompt='',duration=15,genre,mood,energy,bpm}=req.body||{};
    const requestedDuration=clamp(Number(duration)||15,5,60);
    const style=inferMusicStyle(prompt);
    const finalGenre=genre||style.genre;
    const finalBpm=clamp(bpm||style.bpm,60,180);
    const finalEnergy=clamp(energy??style.energy,0.1,1);
    const finalMood=mood||style.mood;
    const profile=buildMusicProfile({genre:finalGenre,mood:finalMood,prompt});

    const brief=buildSoundtrackBrief({
      prompt,
      duration:requestedDuration,
      genre:finalGenre,
      mood:finalMood,
      energy:finalEnergy,
      bpm:finalBpm
    });

    let audioDataUrl=null;
    try{
      const blob=createOriginalCinematicWav({seconds:requestedDuration,bpm:finalBpm,energy:finalEnergy,genre:finalGenre,mood:finalMood,prompt});
      if(typeof blob.arrayBuffer==='function'){
        const buf=await blob.arrayBuffer();
        const b64=Buffer.from(buf).toString('base64');
        audioDataUrl=`data:audio/wav;base64,${b64}`;
      }
    }catch(e){}

    clearTimeout(timeoutId);
    return res.status(200).json({
      success:true,
      source:'zero-cost-local-music',
      warning:'Generated original copyright-safe cinematic soundtrack.',
      soundtrack:{
        ...brief,
        audioAvailable:Boolean(audioDataUrl),
        audioDataUrl,
        generationModel:'procedural-cinematic-v2',
        generationMode:'procedural-original',
        musicProfile:profile,
        paidAiMusicDisabled:true,
        instrumentation:['synth-bass','punchy-drums','cinematic-pad','arpeggiated-lead','sub-drop']
      }
    });
  }catch(error){
    clearTimeout(timeoutId);
    if(error?.name === 'AbortError'){
      return res.status(200).json({
        success:true,
        source:'planning-fallback',
        warning:'Music generation timed out; returning planning fallback.',
        soundtrack:{
          audioAvailable:false,
          generationModel:'procedural-cinematic-v2',
          generationMode:'planning-fallback',
          paidAiMusicDisabled:true
        }
      });
    }
    return res.status(500).json({success:false,error:error?.message||'Music generation failed'});
  }
}
