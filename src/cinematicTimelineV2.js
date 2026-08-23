/* Timeline V2: converts editorial intent into a continuous, gap-free render contract. */
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export function normalizeContinuousTimeline(cuts=[],duration=15){
 const total=Math.max(.35,n(duration,15));
 const list=(Array.isArray(cuts)?cuts:[]).map((c,i)=>({...c,startTime:n(c.startTime??c.start),duration:Math.max(.35,n(c.duration,2)),order:i})).sort((a,b)=>a.startTime-b.startTime);
 const out=[];let cursor=0;
 for(const c of list){
  if(cursor>=total)break;
  const requestedStart=Math.max(0,Math.min(c.startTime,total));
  const editorialGap=Math.max(0,requestedStart-cursor);
  const start=cursor;
  const remaining=total-start;
  if(remaining<.35)break;
  const dur=Math.min(c.duration,remaining);
  out.push({...c,startTime:Number(start.toFixed(3)),duration:Number(dur.toFixed(3)),gapBefore:0,requestedStart:Number(requestedStart.toFixed(3)),closedGap:Number(editorialGap.toFixed(3))});
  cursor=start+dur;
 }
 if(out.length&&cursor<total){out[out.length-1].endPad=Number((total-cursor).toFixed(3));cursor=total;}
 return {version:'timeline-v2',duration:total,cuts:out,gaps:0,closedGaps:Number(out.reduce((s,c)=>s+n(c.closedGap),0).toFixed(3)),continuous:out.length>0&&out.every((c,i)=>i===0||Math.abs(c.startTime-(out[i-1].startTime+out[i-1].duration))<.001)};
}
export function validateNoBlackGaps(timeline={}){const cuts=timeline.cuts||[];return {pass:Boolean(timeline.continuous&&cuts.length>0&&Number(timeline.gaps||0)===0&&cuts.every(c=>c.duration>=.35)),gaps:Number(timeline.gaps||0),closedGaps:Number(timeline.closedGaps||0),reason:timeline.continuous?'No inter-cut black gaps in the editorial timeline.':'Timeline contains an editorial gap.'};}
