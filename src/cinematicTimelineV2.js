/* Timeline V2: converts editorial intent into a continuous, gap-free render contract. */
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export function normalizeContinuousTimeline(cuts=[],duration=15){
 const list=(Array.isArray(cuts)?cuts:[]).map((c,i)=>({...c,startTime:n(c.startTime??c.start),duration:Math.max(.35,n(c.duration,2)),order:i})).sort((a,b)=>a.startTime-b.startTime);
 const out=[];let cursor=0;for(const c of list){const start=Math.max(cursor,Math.min(c.startTime,n(duration)));const max=Math.max(.35,n(duration)-start);if(max<=0)continue;const dur=Math.min(c.duration,max);out.push({...c,startTime:Number(start.toFixed(3)),duration:Number(dur.toFixed(3)),gapBefore:Number(Math.max(0,start-cursor).toFixed(3))});cursor=start+dur;}
 if(out.length&&cursor<n(duration)&&out[out.length-1].duration>0)out[out.length-1].endPad=Number((n(duration)-cursor).toFixed(3));
 return {version:'timeline-v2',duration:n(duration,15),cuts:out,gaps:out.reduce((s,c)=>s+c.gapBefore,0),continuous:out.every((c,i)=>i===0||Math.abs(c.startTime-(out[i-1].startTime+out[i-1].duration))<.001)};
}
export function validateNoBlackGaps(timeline={}){const cuts=timeline.cuts||[];return {pass:Boolean(timeline.continuous&&cuts.length>0&&cuts.every(c=>c.duration>=.35)),gaps:Number(timeline.gaps||0),reason:timeline.continuous?'No inter-cut gaps in the editorial timeline.':'Timeline contains an editorial gap.'};}
