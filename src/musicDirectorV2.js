/* Music Director V2 — original, beat-aware and model agnostic. */
const GENRES=['cinematic','hybrid-rock','hard-rock','electronic','edm','house','hip-hop','ambient','orchestral','acoustic','indie','pop'];
const BPM={cinematic:96,'hybrid-rock':104,'hard-rock':108,electronic:124,edm:128,house:124,'hip-hop':92,ambient:72,orchestral:88,acoustic:96,indie:108,pop:112};
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,a,b,f=a)=>Math.max(a,Math.min(b,n(v,f)));
const t=v=>String(v??'').trim();

export function inferMusicDirection(prompt=''){
 const p=t(prompt).toLowerCase();
 const genre=p.includes('hard rock')||p.includes('hard-rock')?'hard-rock':p.includes('hybrid')?'hybrid-rock':GENRES.find(g=>p.includes(g))||(p.includes('guitar')?'hybrid-rock':p.includes('epic')?'cinematic':'electronic');
 const mood=p.match(/dark|moody|dramatic|menacing/)?'dark':p.match(/happy|bright|fun|uplifting/)?'uplifting':'cinematic';
 const energy=p.match(/calm|relaxed|soft/)?0.35:p.match(/aggressive|intense|energetic|epic|powerful/)?0.9:0.7;
 return {genre,bpm:BPM[genre]||120,mood,energy};
}

export function buildBeatGrid({bpm=120,duration=15,offset=0}={}){
 const safe=clamp(bpm,40,200,120), total=clamp(duration,.5,600,15), spb=60/safe, beats=[];
 for(let i=0;;i++){const time=n(offset)+i*spb;if(time>total+.0001)break;beats.push({index:i,time:Number(time.toFixed(4)),bar:Math.floor(i/4)+1,beat:i%4+1,downbeat:i%4===0});}
 return {version:'beat-grid-v2',bpm:safe,secondsPerBeat:Number(spb.toFixed(6)),duration:total,beats};
}

export function buildMusicBrief({prompt='',duration=15,bpm,genre,mood,energy}={}){
 const inferred=inferMusicDirection(prompt), g=t(genre)||inferred.genre, b=clamp(bpm,60,180,inferred.bpm), e=clamp(energy,0,1,inferred.energy), m=t(mood)||inferred.mood, total=clamp(duration,5,600,15);
 const points=[0,.14,.32,.60,.78,1].map(x=>Number((x*total).toFixed(3)));
 const sections=[['intro',points[0],points[1],Math.max(.3,e-.28),'identity'],['build',points[1],points[2],Math.min(1,e+.02),'anticipation'],['pre-drop',points[2],points[3],Math.min(1,e+.08),'tension'],['main-drop',points[3],points[4],e,'impact'],['final-build',points[4],points[5],Math.min(1,e+.1),'payoff']].filter(s=>s[2]>s[1]).map(s=>({id:s[0],start:s[1],end:s[2],energy:s[3],purpose:s[4]}));
 const beatGrid=buildBeatGrid({bpm:b,duration:total});
 const events=sections.filter(s=>['main-drop','final-build'].includes(s.id)).map(s=>({time:s.start,type:'drop',strength:s.energy}));
 return {version:'music-brief-v2',original:true,genre:g,bpm:b,mood:m,energy:e,duration:total,sections,beatGrid,events,
  creativeRequest:t(prompt)||'Create an original cinematic soundtrack designed specifically for the film.',
  copyrightRule:'Original composition only; do not reproduce or closely imitate named songs, melodies, lyrics, riffs, recordings or distinctive compositions.'};
}

export function alignCutsToMusic(cuts=[],brief){
 const grid=brief?.beatGrid||buildBeatGrid(brief||{}), beats=grid.beats||[];
 const snap=time=>{let best=time,dist=Infinity;for(const b of beats){const d=Math.abs(b.time-time);if(d<dist){best=b.time;dist=d;}}return dist<=Math.min(.18,grid.secondsPerBeat*.35)?best:time;};
 return (Array.isArray(cuts)?cuts:[]).map((c,i)=>{const start=snap(n(c.startTime??c.start)), rawEnd=n(c.endTime??c.end,start+n(c.duration,1)), end=Math.max(start+.25,snap(rawEnd));return {...c,startTime:Number(start.toFixed(3)),endTime:Number(end.toFixed(3)),duration:Number((end-start).toFixed(3)),musicEvent:i===0?'entry':'beat-aligned'};});
}
