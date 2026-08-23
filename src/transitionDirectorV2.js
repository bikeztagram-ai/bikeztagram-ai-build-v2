/* Content-aware transitions: effects are chosen from shot intent and musical events, never at random. */
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export function chooseTransition({from={},to={},beatStrength=0,energy=0.7,position=0,total=15}={}){
 const a=String(from.purpose||from.role||'').toLowerCase(),b=String(to.purpose||to.role||'').toLowerCase(),strong=n(beatStrength)>0.72;
 if(a==='opening'||b==='opening')return 'crossfade';
 if(a.includes('reveal')||b.includes('reveal'))return strong?'impact-cut':'crossfade';
 if(a.includes('action')||b.includes('action'))return strong?'whip':'cut';
 if(a.includes('hero')||b.includes('hero'))return 'cinematic-dissolve';
 if(energy>.84&&strong)return 'flash-cut';
 if(position>total*.8)return 'cinematic-dissolve';
 return 'cut';
}
export function applyDirectedTransitions(cuts=[],music={}){
 const list=Array.isArray(cuts)?cuts:[],beats=music?.beatGrid?.beats||[],duration=n(music?.duration,15);
 const nearest=t=>{let best=0,dist=Infinity;for(const b of beats){const d=Math.abs(n(b.time)-t);if(d<dist){dist=d;best=b.time;}}return dist<=.2?best:t;};
 return list.map((cut,i)=>{if(i===0)return {...cut,transition:'cut',transitionReason:'opening'};const start=n(cut.startTime,n(cut.start));const beat=nearest(start);const beatStrength=beats.find(b=>Math.abs(n(b.time)-beat)<.001)?.downbeat?.9:.45;const transition=chooseTransition({from:list[i-1],to:cut,beatStrength,energy:n(music.energy,.7),position:start,total:duration});return {...cut,startTime:beat,transition,transitionReason:`content+music:${transition}`};});
}
