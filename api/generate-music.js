/* BIKEZTAGRAM AI — original music generation bridge.
   Uses Google's Lyria 3 through the existing server-side Gemini credential boundary.
   Named-song requests are translated into generic musical characteristics; no source recording is used.
*/
import { inferMusicStyle, buildSoundtrackBrief } from '../src/musicDirector.js';

function text(value){return String(value??'').trim();}
function clamp(value,min,max){const n=Number(value);return Math.max(min,max(Number.isFinite(n)?n:min));}
function cleanMusicRequest(prompt, style, duration, model) {
  const namedSong=/\b(back in black|thunderstruck|hotel california|bohemian rhapsody|smells like teen spirit|billie jean)\b/i.test(prompt);
  const namedArtist=/\b(acdc|ac\/dc|metallica|nirvana|taylor swift|drake|the weeknd|queen)\b/i.test(prompt);
  const length=model.includes('pro')?'Create a complete original song with a coherent intro, development, peak, and ending; target approximately '+duration+' seconds.':'Create an original short music clip suitable for a social-video edit; Lyria Clip supplies a 30-second clip.';
  return [
    length,
    `Genre: ${style.genre}.`,
    `Target tempo: approximately ${style.bpm} BPM.`,
    `Mood: ${style.mood}. Energy: ${style.energy}.`,
    'Instrumental-first unless the creative brief clearly calls for vocals.',
    namedSong||namedArtist?'Use only generic characteristics implied by the reference request; do not imitate or reproduce the named song, artist performance, melody, lyrics, riff, recording, or distinctive composition.':'Do not reproduce any existing copyrighted recording, melody, lyrics, riff, vocal performance, or distinctive composition.',
    'Prioritize a strong intro, clear groove, musical sections, transitions and a memorable original hook.',
    'Keep the result suitable for synchronizing visual cuts to an editorial beat grid.'
  ].join(' ');
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Method not allowed'});
  const {prompt='',duration=15,genre,mood,energy,bpm}=req.body||{};
  const requestedDuration=clamp(Number(duration)||15,5,180);
  const style=inferMusicStyle(prompt);
  const brief=buildSoundtrackBrief({prompt,duration:requestedDuration,genre:genre||style.genre,mood:mood||style.mood,energy:energy??style.energy,bpm:bpm||style.bpm});
  const apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey)return res.status(200).json({success:true,source:'planning-fallback',warning:'GEMINI_API_KEY is not configured for Lyria audio generation.',soundtrack:{...brief,audioAvailable:false}});
  const model=requestedDuration<=30?'lyria-3-clip-preview':'lyria-3-pro-preview';
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),110000);
  try{
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{parts:[{text:cleanMusicRequest(text(prompt),style,requestedDuration,model)}]}],generationConfig:{responseModalities:['AUDIO','TEXT']}),signal:controller.signal});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload?.error?.message||`Lyria returned HTTP ${response.status}`);
    const parts=payload?.candidates?.[0]?.content?.parts||[];
    const audio=parts.find(part=>part?.inlineData?.data||part?.inline_data?.data);
    const audioData=audio?.inlineData?.data||audio?.inline_data?.data;
    const mimeType=audio?.inlineData?.mimeType||audio?.inline_data?.mime_type||'audio/mpeg';
    const textParts=parts.map(part=>part?.text).filter(Boolean);
    if(!audioData)throw new Error('Lyria returned no audio data.');
    return res.status(200).json({success:true,source:model,soundtrack:{...brief,audioAvailable:true,audioMimeType:mimeType,audioDataUrl:`data:${mimeType};base64,${audioData}`,generationModel:model,generationText:textParts.join('\n').trim()||null}});
  }catch(error){
    const message=error?.name==='AbortError'?'Lyria request timed out after 110 seconds.':error?.message||'Lyria audio generation unavailable.';
    console.error('[GENERATE-MUSIC] ERROR',message);
    return res.status(200).json({success:true,source:'planning-fallback',warning:message,soundtrack:{...brief,audioAvailable:false,generationModel:model}});
  }finally{clearTimeout(timeout);}
}
