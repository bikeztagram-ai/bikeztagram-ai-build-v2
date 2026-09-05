/* Universal creative continuity pass: turns a valid director plan into a more deliberate film grammar. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const text=v=>String(v||'').toLowerCase();
const actionLike=p=>/action|chase|race|fight|battle|aggressive|fast|energetic|viral|sports|fpv/.test(text(p));
const darkLike=p=>/dark|noir|horror|suspense|mysterious|night|thriller/.test(text(p));
const emotionalLike=p=>/emotional|romantic|beautiful|nostalgic|heartfelt|dreamy|calm/.test(text(p));

export function prepareCreativeContinuity(plan,{creativePrompt='',duration=0}={}){
  if(!plan?.cuts?.length)return plan;
  const cuts=plan.cuts.map((cut,index)=>({...cut}));
  const action=actionLike(creativePrompt),dark=darkLike(creativePrompt),emotional=emotionalLike(creativePrompt);
  const used=new Set();
  for(let i=0;i<cuts.length;i+=1){
    const c=cuts[i];
    c.sequenceIndex=i;
    c.storyBeat=c.purpose||(['opening','build','escalation','action','hero-ending'][Math.min(i,4)]);
    c.duration=clamp(Number(c.duration)||2,.5,8);
    c.motionStyle=c.motionStyle||(['slow-push','pan-right','slow-pull','pan-left','slow-push'][i%5]);
    if(action && i>0 && i<cuts.length-1)c.motionStyle=i%2?'whip-right':'pan-right';
    if(emotional)c.motionStyle=i%2?'slow-pull':'slow-push';
    if(!c.transition||c.transition==='hard-cut'){
      if(i===0)c.transition='fade-in';
      else if(i===cuts.length-1)c.transition='fade-out';
      else if(action)c.transition=i%2?'whip-right':'flash-cut';
      else if(dark)c.transition=i%2?'dip-black':'crossfade';
      else c.transition=i%2?'crossfade':'hard-cut';
    }
    c.transitionDuration=clamp(Number(c.transitionDuration)||.28,.12,.65);
    c.speed=clamp(Number(c.speed)||1,action?.65:.5,action?1.6:1.5);
    if(action && i%3===1)c.speed=Math.max(c.speed,1.15);
    if(emotional)c.speed=Math.min(c.speed,.92);
    if(i===cuts.length-1)c.speed=Math.min(c.speed,.9);
    const source=Number.isInteger(Number(c.mediaIndex))?Number(c.mediaIndex):null;
    c.repetitionPenalty=source!=null&&used.has(source)?1:0;
    if(source!=null)used.add(source);
    c.editorialPriority=Number(c.directorSelectionScore)||0;
    c.continuity={shotIndex:i,shotCount:cuts.length,previousSourceIndex:i?cuts[i-1].mediaIndex:null,nextSourceIndex:i<cuts.length-1?cuts[i+1].mediaIndex:null,avoidRepeatedSource:Boolean(c.repetitionPenalty)};
  }
  const total=cuts.reduce((s,c)=>s+c.duration,0);
  return {...plan,cuts,duration:Number(total.toFixed(2)),creativeContinuity:{version:'1.0',action,dark,emotional,shotCount:cuts.length,targetDuration:Number(duration)||plan.targetDuration||total}};
}
