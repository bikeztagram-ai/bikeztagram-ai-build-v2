/* BIKEZTAGRAM AI — beat-aware edit timing layer.
   Pure product logic: consumes an existing edit plan + analysed beat grid.
   It never generates copyrighted music and never changes the render transport.
*/

const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function beatsFrom(soundtrack){
  if(Array.isArray(soundtrack?.beatGrid))return soundtrack.beatGrid.map(n).filter(Number.isFinite).sort((a,b)=>a-b);
  if(Array.isArray(soundtrack?.audioAnalysis?.beatGrid))return soundtrack.audioAnalysis.beatGrid.map(n).filter(Number.isFinite).sort((a,b)=>a-b);
  return [];
}

function nearestBeat(beats,time,direction='nearest'){
  if(!beats.length)return time;
  let best=beats[0];let distance=Math.abs(best-time);
  for(const beat of beats){const d=Math.abs(beat-time);if((direction==='after'&&beat>=time&&beat-time<distance)||(direction==='before'&&beat<=time&&time-beat<distance)||(direction==='nearest'&&d<distance)){best=beat;distance=d;}}
  return best;
}

function snapDuration(start,end,beats){
  if(!beats.length)return Math.max(.5,end-start);
  const snappedStart=nearestBeat(beats,start,'nearest');
  const candidates=beats.filter(b=>b>snappedStart+.35&&b<=end+.75);
  const snappedEnd=candidates.length?candidates[candidates.length-1]:nearestBeat(beats,end,'nearest');
  return Math.max(.5,snappedEnd-snappedStart);
}

function sectionFor(index,total){
  if(index===0)return'intro';
  if(index===total-1)return'hero-outro';
  const q=index/Math.max(1,total-1);
  if(q<.3)return'build';
  if(q<.62)return'escalation';
  return'drop';
}

export function alignPlanToBeats(plan,soundtrack,{snap=true,minDuration=.65,maxDuration=6}={}){
  const beats=beatsFrom(soundtrack);
  const cuts=Array.isArray(plan?.cuts)?plan.cuts:[];
  if(!cuts.length||!beats.length)return{plan,changed:false,beatsUsed:beats.length,events:[]};
  let cursor=0;
  const events=[];
  const nextCuts=cuts.map((cut,index)=>{
    const requested=Math.max(minDuration,Math.min(maxDuration,n(cut.duration,2)));
    const rawStart=n(cut.timelineStart,cursor);
    const rawEnd=rawStart+requested;
    const start=snap?nearestBeat(beats,rawStart,'nearest'):rawStart;
    const duration=snap?snapDuration(start,rawEnd,beats):requested;
    const section=sectionFor(index,cuts.length);
    const beatIndex=beats.findIndex(b=>Math.abs(b-start)<.001);
    const energy=section==='intro'?.65:section==='build'?.8:section==='escalation'?1:section==='drop'?1.15:.7;
    const next={...cut,timelineStart:Number(start.toFixed(3)),duration:Number(clamp(duration,minDuration,maxDuration).toFixed(3)),beatIndex:beatIndex<0?undefined:beatIndex,beatSection:section,beatEnergy:energy};
    events.push({cutIndex:index,time:next.timelineStart,section,energy});
    cursor=start+next.duration;
    return next;
  });
  const total=nextCuts.reduce((s,c)=>s+n(c.duration),0);
  return{plan:{...plan,cuts:nextCuts,musicTiming:{enabled:true,bpm:n(soundtrack?.bpm,0),beatCount:beats.length,sections:events}},changed:true,beatsUsed:beats.length,events};
}

export function buildMusicEditEvents(plan,soundtrack){
  const beats=beatsFrom(soundtrack);
  const cuts=Array.isArray(plan?.cuts)?plan.cuts:[];
  return cuts.map((cut,index)=>({
    type:'edit-hit',
    cutIndex:index,
    time:n(cut.timelineStart,0),
    duration:n(cut.duration,0),
    beatIndex:cut.beatIndex,
    section:cut.beatSection||sectionFor(index,cuts.length),
    energy:n(cut.beatEnergy,1),
    nearestBeat:nearestBeat(beats,n(cut.timelineStart,0),'nearest')
  }));
}
