/* BIKEZTAGRAM AI — cinematic music arrangement layer.
 * Pure planning: turns an analysed beat grid into musical sections and edit events.
 * Intentionally isolated from the autonomous-builder runner and current renderer.
 */

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function normaliseBeatGrid(beatGrid,duration=15){
  const raw=Array.isArray(beatGrid)?beatGrid:beatGrid?.beats;
  const beats=(raw||[]).map((b,i)=>Number(typeof b==='number'?b:b?.time)).filter(Number.isFinite).filter(t=>t>=0&&t<=duration).sort((a,b)=>a-b);
  if(beats.length)return [...new Set(beats)];
  const bpm=Number(beatGrid?.bpm)||112;
  const interval=60/bpm;
  const out=[];
  for(let t=0;t<=duration+1e-6;t+=interval)out.push(Number(t.toFixed(4)));
  return out;
}

export function buildCinematicMusicArrangement({beatGrid,duration=15,bpm=112,energy='rising'}={}){
  const total=clamp(Number(duration)||15,5,180);
  const beats=normaliseBeatGrid(beatGrid,total);
  const beatInterval=beats.length>1?beats[1]-beats[0]:60/(Number(bpm)||112);
  const bars=Math.max(1,Math.floor(beats.length/4));
  const sectionCount=Math.min(6,Math.max(3,Math.ceil(total/4)));
  const sectionSize=total/sectionCount;
  const modes=String(energy).toLowerCase().includes('calm')
    ? ['intro','build','lift','hero','outro']
    : ['intro','build','tension','drop','hero','outro'];
  const sections=Array.from({length:sectionCount},(_,i)=>{
    const start=i*sectionSize;
    const end=i===sectionCount-1?total:(i+1)*sectionSize;
    const ratio=i/Math.max(1,sectionCount-1);
    const level=clamp(Math.round((0.25+ratio*0.75)*100)/100,.2,1);
    return {id:`section-${i+1}`,name:modes[i]||'hero',start:Number(start.toFixed(3)),duration:Number((end-start).toFixed(3)),energy:level,barStart:Math.floor(start/(beatInterval*4))+1};
  });
  const events=[];
  sections.forEach((section,i)=>{
    const firstBeat=beats.find(t=>t>=section.start-1e-6);
    if(Number.isFinite(firstBeat))events.push({time:firstBeat,type:'section',sectionId:section.id,name:section.name});
    if(section.name==='drop'||section.name==='hero')events.push({time:Number(section.start.toFixed(3)),type:'impact',intensity:section.energy});
  });
  return {bpm:Number(bpm)||Number(beatGrid?.bpm)||112,duration:total,beatInterval:Number(beatInterval.toFixed(4)),bars,sections,events,beatGrid:beats,energy:String(energy||'rising')};
}

export function attachMusicEventsToCuts(cuts=[],arrangement){
  if(!Array.isArray(cuts)||!arrangement)return cuts||[];
  return cuts.map((cut,index)=>{
    const start=Number(cut.startTime??0);
    const nearest=arrangement.events.reduce((best,event)=>Math.abs(event.time-start)<Math.abs(best.time-start)?event:best,arrangement.events[0]||{time:start,type:'beat'});
    const section=arrangement.sections.find(s=>start>=s.start&&start<s.start+s.duration)||arrangement.sections.at(-1);
    return {...cut,music:{beatTime:nearest?.time??start,section:section?.name||'hero',energy:section?.energy||.5,isImpact:nearest?.type==='impact'},musicSyncIndex:index};
  });
}

export function describeMusicArrangement(arrangement){
  if(!arrangement)return 'No soundtrack arrangement.';
  return `${arrangement.bpm} BPM • ${arrangement.sections.length} sections • ${arrangement.events.length} musical events • ${arrangement.beatGrid.length} beats`;
}
