/* Autonomous film QA for batches 88-91. Pure contract layer; renderer remains responsible for pixels/audio. */
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export function inspectCinematicResult({timeline={},soundtrack={},renderMeta={}}={}){
 const cuts=Array.isArray(timeline.cuts)?timeline.cuts:[];
 const gaps=Array.isArray(timeline.gaps)?timeline.gaps:[];
 const issues=[];
 if(gaps.length)issues.push({type:'timeline-gap',severity:'critical',count:gaps.length});
 if(!soundtrack?.sections?.length)issues.push({type:'missing-soundtrack-sections',severity:'high'});
 if(!soundtrack?.beatGrid?.length)issues.push({type:'missing-beat-grid',severity:'high'});
 if(cuts.length<2)issues.push({type:'insufficient-cuts',severity:'medium'});
 const duplicateMedia=[];for(let i=1;i<cuts.length;i++)if(cuts[i].mediaIndex!=null&&cuts[i].mediaIndex===cuts[i-1].mediaIndex)duplicateMedia.push(i);
 if(duplicateMedia.length)issues.push({type:'repetitive-adjacent-shots',severity:'medium',indexes:duplicateMedia});
 if(n(renderMeta.duration)>0&&n(timeline.duration)>0&&Math.abs(n(renderMeta.duration)-n(timeline.duration))>.25)issues.push({type:'duration-mismatch',severity:'high'});
 return {pass:issues.length===0,issues,score:Math.max(0,100-issues.reduce((s,i)=>s+(i.severity==='critical'?35:i.severity==='high'?20:10),0)),checked:{cuts:cuts.length,gaps:gaps.length,sections:soundtrack?.sections?.length||0,beats:soundtrack?.beatGrid?.length||0}};
}
export function repairCinematicPlan(plan={}){
 const next={...plan,cuts:Array.isArray(plan.cuts)?plan.cuts.map(c=>({...c})):[]};
 for(let i=1;i<next.cuts.length;i++){
  const prev=next.cuts[i-1],cur=next.cuts[i];
  const expected=n(prev.startTime)+n(prev.duration);cur.startTime=Number(expected.toFixed(4));
  if(!cur.transition||cur.transition==='dip-black')cur.transition='hard-cut';
 }
 next.cinematicRepair={applied:true,reason:'removed accidental gaps/ambiguous transitions'};
 return next;
}
