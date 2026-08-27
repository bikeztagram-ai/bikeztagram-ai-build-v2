/* BIKEZTAGRAM AI — universal soundtrack director.
   Plans original music and beat-aware editing without copying a named song.
   The direction layer is deterministic so a creative brief can shape music
   even when the remote music provider is unavailable. */
const GENRES=['hard-rock','hip-hop','rock','pop','electronic','edm','trance','house','cinematic','ambient','acoustic','indie','orchestral','drum-and-bass','synthwave'];
const DEFAULT_BPM={rock:108,'hard-rock':104,pop:112,electronic:124,edm:128,trance:132,house:124,'hip-hop':92,cinematic:96,ambient:72,acoustic:96,indie:108,orchestral:88,'drum-and-bass':150,synthwave:112};
function text(value){return String(value??'').trim();}
function number(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function clamp(value,min,max){return Math.max(min,Math.min(max,number(value,min)));}
function has(p,...terms){return terms.some(term=>p.includes(term));}
function inferMood(p){
 if(has(p,'horror','scary','creepy','eerie','suspense','mystery'))return'suspenseful';
 if(has(p,'dark','moody','gritty','noir','night','shadow'))return'dark';
 if(has(p,'epic','huge','massive','blockbuster','monumental','spectacular'))return'epic';
 if(has(p,'emotional','romantic','beautiful','heartfelt','nostalgic','sentimental'))return'emotional';
 if(has(p,'funny','comedy','comic','humorous','playful','meme'))return'playful';
 if(has(p,'uplifting','positive','joyful','happy','celebration'))return'uplifting';
 if(has(p,'action','fast','race','speed','chase','aggressive','energetic','punchy'))return'energetic';
 return'cinematic';
}
function inferGenre(p){
 if(has(p,'drum and bass','drum & bass','dnb','jungle'))return'drum-and-bass';
 if(has(p,'synthwave','retro','80s','neon','outrun'))return'synthwave';
 if(has(p,'hard rock','hard-rock','metal','heavy riff'))return'hard-rock';
 if(has(p,'hip hop','hip-hop','rap','urban'))return'hip-hop';
 if(has(p,'rock','guitar','riff'))return'rock';
 if(has(p,'ambient','meditative','peaceful','minimal'))return'ambient';
 if(has(p,'acoustic','folk','organic','intimate','warm'))return'acoustic';
 if(has(p,'house','dance'))return'house';
 if(has(p,'trance'))return'trance';
 if(has(p,'edm'))return'edm';
 if(has(p,'orchestral','orchestra','strings','symphonic'))return'orchestral';
 if(has(p,'indie'))return'indie';
 if(has(p,'pop'))return'pop';
 if(has(p,'cinematic','trailer','film','movie','commercial','promo','epic'))return'cinematic';
 return'electronic';
}
function inferEnergy(p){
 if(has(p,'explosive','extreme','very high','aggressive','intense'))return .95;
 if(has(p,'action','fast','race','speed','chase','energetic','punchy','viral','high energy'))return .86;
 if(has(p,'calm','ambient','gentle','peaceful','slow','emotional','beautiful'))return .42;
 return .68;
}
function inferDuration(prompt,fallback){
 const match=prompt.toLowerCase().match(/\b(?:for|of|around|about)?\s*(\d{1,3}(?:\.\d+)?)\s*(?:sec|secs|second|seconds|s)\b/);
 return match?clamp(match[1],5,600):clamp(fallback,5,600);
}
function inferBpm(p,fallback,genre){
 const match=p.match(/\b(\d{2,3})\s*bpm\b/);
 if(match)return clamp(match[1],60,180);
 if(has(p,'very slow','slow motion'))return 72;
 if(has(p,'slow','calm','ambient'))return 78;
 if(has(p,'fast','action','race','chase','high energy','punchy'))return 132;
 if(has(p,'very fast','aggressive','explosive','drum and bass','dnb'))return 150;
 return clamp(fallback||DEFAULT_BPM[genre]||112,60,180);
}
export function inferMusicStyle(prompt=''){
 const p=text(prompt).toLowerCase();
 const genre=inferGenre(p),bpm=inferBpm(p,DEFAULT_BPM[genre],genre),energy=inferEnergy(p),mood=inferMood(p);
 return{genre,bpm,energy,mood,directionSource:'creative-brief'};
}
export function buildBeatGrid({bpm=120,duration=15,offset=0}={}){
 const safeBpm=clamp(bpm,40,200),secondsPerBeat=60/safeBpm,total=clamp(duration,.5,600),beats=[];
 for(let i=0,t=number(offset,0);t<=total+.0001;i++,t=number(offset,0)+i*secondsPerBeat)beats.push({index:i,time:Number(t.toFixed(4)),bar:Math.floor(i/4)+1,beat:i%4+1,downbeat:i%4===0});
 return{version:'beat-grid-v1',bpm:safeBpm,secondsPerBeat:Number(secondsPerBeat.toFixed(6)),duration:total,beats};
}
export function buildSoundtrackBrief({prompt='',duration=15,bpm,genre,mood,energy}={}){
 const inferred=inferMusicStyle(prompt),finalGenre=text(genre)||inferred.genre,finalBpm=clamp(bpm||inferBpm(text(prompt).toLowerCase(),inferred.bpm,finalGenre),60,180),finalEnergy=clamp(energy??inferred.energy,0,1),finalMood=text(mood)||inferred.mood,total=inferDuration(text(prompt),duration);
 const sections=[
  {id:'intro',start:0,end:Math.min(2,total),energy:Math.max(.35,finalEnergy-.25),purpose:'establish the sonic identity'},
  {id:'build',start:Math.min(2,total),end:Math.min(6,total),energy:Math.min(1,finalEnergy+.02),purpose:'increase anticipation and editorial momentum'},
  {id:'main',start:Math.min(6,total),end:Math.min(11,total),energy:finalEnergy,purpose:'deliver the primary hook or groove'},
  {id:'finale',start:Math.min(11,total),end:total,energy:Math.min(1,finalEnergy+.08),purpose:'hero ending and final visual payoff'}
 ].filter(s=>s.end>s.start);
 return{version:'soundtrack-brief-v2',original:true,genre:finalGenre,bpm:finalBpm,mood:finalMood,energy:finalEnergy,duration:total,sections,beatGrid:buildBeatGrid({bpm:finalBpm,duration:total}),creativeRequest:text(prompt)||'Create an original cinematic soundtrack that supports the edit.',copyrightRule:'Do not reproduce or closely imitate a named copyrighted song, melody, lyrics, riff, recording or distinctive composition.',swapReady:true,swapWorkflow:'Keep editorial events aligned to the beat grid so a suitably licensed replacement track can be substituted later.',directionSource:'creative-brief'};
}
export function snapTimeToBeat(time,beatGrid,tolerance=.18){
 const t=number(time,0),beats=Array.isArray(beatGrid?.beats)?beatGrid.beats:[];if(!beats.length)return t;let best=beats[0],distance=Math.abs(t-best.time);
 for(const beat of beats){const d=Math.abs(t-beat.time);if(d<distance){best=beat;distance=d;}}
 return distance<=tolerance?best.time:t;
}
export function snapTimeToSection(time,sections,tolerance=.5){
 const t=number(time,0),boundaries=(Array.isArray(sections)?sections:[]).flatMap(s=>[s.start,s.end]).filter(Number.isFinite);if(!boundaries.length)return t;
 let best=boundaries[0],distance=Math.abs(t-best);for(const b of boundaries){const d=Math.abs(t-b);if(d<distance){best=b;distance=d;}}return distance<=tolerance?best:t;
}
export function alignCutsToMusic(cuts=[],soundtrack){
 const grid=soundtrack?.beatGrid||buildBeatGrid({bpm:soundtrack?.bpm||120,duration:soundtrack?.duration||15}),sections=soundtrack?.sections||[];
 return(Array.isArray(cuts)?cuts:[]).map((cut,index)=>{
  const rawStart=cut.startTime??cut.start??0,rawEnd=number(cut.endTime??cut.end??rawStart+number(cut.duration,1),rawStart+1);
  const start=snapTimeToSection(snapTimeToBeat(rawStart,grid),sections),end=Math.max(start+.25,snapTimeToSection(snapTimeToBeat(rawEnd,grid),sections));
  return{...cut,startTime:Number(start.toFixed(3)),endTime:Number(end.toFixed(3)),duration:Number((end-start).toFixed(3)),music:{beatAligned:true,startBeat:grid.beats.find(b=>Math.abs(b.time-start)<.0001)?.index??null,endBeat:grid.beats.find(b=>Math.abs(b.time-end)<.0001)?.index??null,editorialEvent:index===0?'entry':'cut'}};
 });
}
export function describeSoundtrack(brief){return`${brief?.genre||'cinematic'} • ${brief?.bpm||120} BPM • ${brief?.mood||'cinematic'} • ${Array.isArray(brief?.sections)?brief.sections.length:0} sections • original music • beat-grid ready`;
}
