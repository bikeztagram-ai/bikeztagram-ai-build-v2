/* Bikeztagram AI — provider-neutral music director.
 * V2 keeps the director ours and makes the renderer replaceable.
 */
import {buildSongBrain,songBrainToInstruction} from './musicSongBrain.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||a));
const clean=text=>String(text||'').replace(/\s+/g,' ').trim();

export function compileMusicRequest(input={}){
 const brain=buildSongBrain(input);
 return {
  ...brain,
  version:'music-director-v2',
  instruction:songBrainToInstruction(brain)
 };
}

function topicWords(prompt){
 const p=clean(prompt).replace(/[^a-zA-Z0-9' ]/g,' ').split(/\s+/).filter(Boolean);
 return p.filter(w=>w.length>3&&!/^(make|song|music|about|with|that|this|into|from|like|style|please|create|original)$/i.test(w)).slice(0,8);
}

export function generateDirectorLyrics(brief={}){
 if(brief.forceInstrumental)return '[Intro]\n(instrumental)\n[Verse]\n(instrumental)\n[Chorus]\n(instrumental)';
 if(brief.lyrics)return brief.lyrics;
 const topic=topicWords(brief.prompt),subject=topic.length?topic.join(' '):'the road tonight',mood=brief.mood||'cinematic';
 const banks={
  dark:['Under the midnight sky, the city holds its breath','Every shadow moves like it remembers what we left','No turning back, no looking down','We light the dark and own this town'],
  uplifting:['Feel the world open wide beneath our feet','Every little heartbeat finds the beat','We rise together, higher than before','Open up the night and give us more'],
  emotional:['Hold this moment close before it fades away','Every road remembers every word we could not say','If the night gets heavy, stay with me','There is still a light ahead that we can see'],
  dreamy:['Drift with the lights while the whole world slows','Follow the feeling wherever it goes','Let the night breathe, let the colours run','We are still here underneath the sun'],
  energetic:['Turn it up, let the whole room shake','Every heartbeat hits like an earthquake','No brakes tonight, we are moving fast','Make this moment something built to last'],
  cinematic:['The night begins to move, a spark becomes a flame','The road is calling and it knows us by name','We cross the line where the old world ends','And start again with fire in our hands']
 };
 const b=banks[mood]||banks.cinematic,hook=subject.split(' ').slice(0,5).map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ');
 return ['[Verse 1]',b[0],b[1],'We carry '+subject+' through the night','[Pre-Chorus]',b[2],b[3],'[Chorus]',hook+' tonight',b[3],b[0],hook+' tonight','[Verse 2]',b[1],'We keep the rhythm underneath our feet',b[0],'[Bridge]','Everything we were is turning into now','Let the music rise and pull us through the crowd','[Final Chorus]',hook+' tonight',b[3],b[0],hook+' tonight'].join('\n');
}

export function prepareMusicGeneration(input={}){
 const brief=compileMusicRequest(input);
 return {...brief,lyrics:generateDirectorLyrics(brief)};
}

export function getConfiguredMusicEngineUrl(){
 return String(import.meta?.env?.VITE_MUSIC_ENGINE_URL||'').trim().replace(/\/$/,'');
}
