/* Continuous timeline contract: no accidental empty time between shots. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const allowed=new Set(['hard-cut','crossfade','whip-left','whip-right','flash-cut','zoom-punch','light-leak','dip-black']);
const pickTransition=(cut,index,section)=>{
  if(index===0)return 'fade-in';
  const purpose=String(cut?.purpose||'').toLowerCase();
  if(/reveal|hero|impact/.test(purpose))return 'flash-cut';
  if(/action|speed|chase|race/.test(purpose))return index%2?'whip-right':'whip-left';
  if(section==='build')return 'crossfade';
  return 'hard-cut';
};
export function buildContinuousTimeline(cuts=[],duration){
  const source=Array.isArray(cuts)?cuts:[];const timeline=[];let cursor=0;
  source.forEach((cut,index)=>{
    const requested=clamp(cut?.duration||2,.35,12);const remaining=duration==null?requested:Math.max(.35,Number(duration)-cursor);
    if(duration!=null&&cursor>=Number(duration))return;
    const d=Math.min(requested,remaining);
    const section=String(cut?.section||cut?.purpose||'').toLowerCase();
    const transition=allowed.has(cut?.transition)?cut.transition:pickTransition(cut,index,section);
    timeline.push({...cut,startTime:Number(cursor.toFixed(4)),duration:Number(d.toFixed(4)),transition,index});
    cursor+=d;
  });
  if(duration!=null&&timeline.length){const end=Number(duration);const last=timeline[timeline.length-1];const delta=end-(last.startTime+last.duration);if(Math.abs(delta)>.001&&delta>0)last.duration=Number((last.duration+delta).toFixed(4));}
  return {duration:timeline.reduce((n,c)=>n+c.duration,0),cuts:timeline,gaps:findTimelineGaps(timeline),continuous:true};
}
export function findTimelineGaps(cuts=[]){const gaps=[];for(let i=1;i<cuts.length;i++){const prev=cuts[i-1],cur=cuts[i],gap=Number(cur.startTime)-(Number(prev.startTime)+Number(prev.duration));if(gap>.001)gaps.push({after:i-1,start:prev.startTime+prev.duration,duration:gap});}return gaps;}
