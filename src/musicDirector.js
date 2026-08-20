/* BIKEZTAGRAM AI — universal soundtrack director.
   This module plans original music and beat-aware editing without copying a named song.
*/

const GENRES = ['rock','hard-rock','pop','electronic','edm','trance','house','hip-hop','cinematic','ambient','acoustic','indie','orchestral'];
const DEFAULT_BPM = { rock: 108, 'hard-rock': 104, pop: 112, electronic: 124, edm: 128, trance: 132, house: 124, 'hip-hop': 92, cinematic: 96, ambient: 72, acoustic: 96, indie: 108, orchestral: 88 };

function text(value){return String(value ?? '').trim();}
function number(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function clamp(value,min,max){return Math.max(min,Math.min(max,number(value,min)));}

export function inferMusicStyle(prompt=''){
  const p=text(prompt).toLowerCase();
  const genre = GENRES.find(g => p.includes(g)) || (p.includes('guitar') ? 'rock' : p.includes('dance') ? 'edm' : p.includes('epic') ? 'cinematic' : 'electronic');
  const bpm = clamp(DEFAULT_BPM[genre] || 120, 60, 180);
  const energy = p.match(/calm|peaceful|relaxed/) ? 0.35 : p.match(/aggressive|intense|energetic|epic|powerful/) ? 0.9 : 0.68;
  return { genre, bpm, energy, mood: p.match(/dark|moody|dramatic/) ? 'dark' : p.match(/happy|joy|fun|playful/) ? 'uplifting' : 'cinematic' };
}

export function buildBeatGrid({bpm=120,duration=15,offset=0}={}){
  const safeBpm=clamp(bpm,40,200), secondsPerBeat=60/safeBpm, total=clamp(duration,0.5,600);
  const beats=[];
  for(let i=0, t=number(offset,0);t<=total+0.0001;i++,t=number(offset,0)+i*secondsPerBeat){
    beats.push({index:i,time:Number(t.toFixed(4)),bar:Math.floor(i/4)+1,beat:(i%4)+1,downbeat:i%4===0});
  }
  return {version:'beat-grid-v1',bpm:safeBpm,secondsPerBeat:Number(secondsPerBeat.toFixed(6)),duration:total,beats};
}

export function buildSoundtrackBrief({prompt='',duration=15,bpm,genre,mood,energy}={}){
  const inferred=inferMusicStyle(prompt);
  const finalGenre=text(genre)||inferred.genre;
  const finalBpm=clamp(bpm||inferred.bpm,60,180);
  const finalEnergy=clamp(energy??inferred.energy,0,1);
  const finalMood=text(mood)||inferred.mood;
  const total=clamp(duration,5,600);
  const sections=[
    {id:'intro',start:0,end:Math.min(2,total),energy:Math.max(.35,finalEnergy-.25),purpose:'establish the sonic identity'},
    {id:'build',start:Math.min(2,total),end:Math.min(6,total),energy:Math.min(1,finalEnergy+.02),purpose:'increase anticipation and editorial momentum'},
    {id:'main',start:Math.min(6,total),end:Math.min(11,total),energy:finalEnergy,purpose:'deliver the primary hook or groove'},
    {id:'finale',start:Math.min(11,total),end:total,energy:Math.min(1,finalEnergy+.08),purpose:'hero ending and final visual payoff'}
  ].filter(s=>s.end>s.start);
  return {version:'soundtrack-brief-v1',original:true,genre:finalGenre,bpm:finalBpm,mood:finalMood,energy:finalEnergy,duration:total,sections,beatGrid:buildBeatGrid({bpm:finalBpm,duration:total}),creativeRequest:text(prompt)||'Create an original cinematic soundtrack that supports the edit.',copyrightRule:'Do not reproduce or closely imitate a named copyrighted song, melody, lyrics, riff, recording or distinctive composition.',swapReady:true,swapWorkflow:'Keep editorial events aligned to the beat grid so a suitably licensed replacement track can be substituted later.'};
}

export function snapTimeToBeat(time, beatGrid, tolerance=0.18){
  const t=number(time,0); const beats=Array.isArray(beatGrid?.beats)?beatGrid.beats:[]; if(!beats.length)return t;
  let best=beats[0]; let distance=Math.abs(t-best.time);
  for(const beat of beats){const d=Math.abs(t-beat.time);if(d<distance){best=beat;distance=d;}}
  return distance<=tolerance?best.time:t;
}

export function alignCutsToMusic(cuts=[],soundtrack){
  const grid=soundtrack?.beatGrid || buildBeatGrid({bpm:soundtrack?.bpm||120,duration:soundtrack?.duration||15});
  return (Array.isArray(cuts)?cuts:[]).map((cut,index)=>{
    const start=snapTimeToBeat(cut.startTime ?? cut.start ?? 0,grid);
    const rawEnd=number(cut.endTime ?? cut.end ?? start+number(cut.duration,1),start+1);
    const end=Math.max(start+0.25,snapTimeToBeat(rawEnd,grid));
    return {...cut,startTime:Number(start.toFixed(3)),endTime:Number(end.toFixed(3)),duration:Number((end-start).toFixed(3)),music:{beatAligned:true,startBeat:grid.beats.find(b=>b.time===start)?.index ?? null,endBeat:grid.beats.find(b=>b.time===end)?.index ?? null,editorialEvent:index===0?'entry':'cut'}};
  });
}

export function describeSoundtrack(brief){return `${brief?.genre||'cinematic'} • ${brief?.bpm||120} BPM • ${brief?.mood||'cinematic'} • ${Array.isArray(brief?.sections)?brief.sections.length:0} sections • original music • beat-grid ready`}
