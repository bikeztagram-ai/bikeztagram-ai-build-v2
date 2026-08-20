/* BIKEZTAGRAM AI — final render preflight gate
   Keeps the browser renderer from starting with an obviously broken timeline. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const key=(cut)=>`${String(cut?.mediaId??cut?.mediaIndex??'media')}:${Math.round(n(cut?.startTime??cut?.start,0)*2)/2}`;

export function inspectRenderPlan(cuts=[],mediaItems=[],options={}){
  const issues=[],warnings=[];const list=Array.isArray(cuts)?cuts:[];const media=Array.isArray(mediaItems)?mediaItems:[];
  if(!list.length)issues.push('No edit cuts were produced.');
  const duration=list.reduce((sum,c)=>sum+n(c?.duration),0);
  if(duration<2)issues.push('Edit duration is too short to render reliably.');
  if(duration>60)warnings.push('Edit is longer than the preferred social-video range.');
  const duplicateKeys=new Set();let duplicateCount=0;
  for(const cut of list){const k=key(cut);if(duplicateKeys.has(k))duplicateCount++;else duplicateKeys.add(k);
    const generated=Boolean(cut?.generated||cut?.sourceType==='generated'||cut?.generationPrompt);
    if(!generated){const index=Number(cut?.mediaIndex);if(!Number.isInteger(index)||!media[index])issues.push(`Cut ${list.indexOf(cut)+1} references missing uploaded media.`);}
    if(n(cut?.duration)<=0)issues.push(`Cut ${list.indexOf(cut)+1} has no usable duration.`);
    if(n(cut?.duration)>10)warnings.push(`Cut ${list.indexOf(cut)+1} is unusually long.`);
    if(n(cut?.motionIntensity,0)>0.65)warnings.push(`Cut ${list.indexOf(cut)+1} requests excessive motion intensity.`);
  }
  if(duplicateCount)warnings.push(`${duplicateCount} exact source moments are repeated.`);
  const expected=clamp(n(options.targetDuration,duration),2,60);const drift=Math.abs(duration-expected);
  if(drift>Math.max(1,expected*.18))warnings.push(`Timeline duration differs from target by ${drift.toFixed(1)}s.`);
  const first=list[0],last=list.at(-1);if(first&&first.role&&first.role!=='hook')warnings.push('Opening cut is not marked as the hook.');if(last&&last.role&&!['hero-ending','payoff'].includes(last.role))warnings.push('Final cut is not marked as the ending.');
  return{ready:issues.length===0,issues,warnings,cutCount:list.length,duration:Number(duration.toFixed(2)),targetDuration:Number(expected.toFixed(2)),durationDrift:Number(drift.toFixed(2)),duplicateCount};
}

export function assertRenderPlan(cuts,mediaItems,options={}){const result=inspectRenderPlan(cuts,mediaItems,options);if(!result.ready)throw new Error(`Render preflight failed: ${result.issues.join(' ')}`);return result;}
