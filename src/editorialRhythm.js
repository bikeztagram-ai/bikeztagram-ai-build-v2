/* BIKEZTAGRAM AI — universal local editorial rhythm planner. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const n=(v,d=0)=>{const x=Number(v);return Number.isFinite(x)?x:d};
const text=v=>String(v??'').toLowerCase();
function intent(prompt=''){const p=text(prompt);return{fast:/fast|action|energetic|race|chase|aggressive|high energy/.test(p),calm:/calm|slow|peaceful|emotional|beautiful|romantic|ambient/.test(p),trailer:/trailer|teaser|cinematic|commercial|promo/.test(p),dramatic:/dramatic|dark|moody|mysterious|gritty/.test(p)};}
function role(c,i,total){const r=text(c.editorialRole||c.role||c.purpose);if(/hook|opening/.test(r))return'hook';if(/build|setup|approach/.test(r))return'build';if(/reveal|unveil|showcase/.test(r))return'reveal';if(/action|impact|chase/.test(r))return'action';if(/emotional|emotion/.test(r))return'emotional';if(/hero|ending|resolution|final/.test(r))return'hero';if(i===0)return'hook';if(i===total-1)return'hero';return'variation';}
function baseDuration(c,intentValue,i,total){const quality=n(c.directorSelectionScore,c.score);const r=role(c,i,total);let d=r==='hook'?.9:r==='hero'?1.7:r==='action'?1.0:r==='reveal'?1.2:r==='emotional'?1.7:1.3;if(quality>180)d+=.15;if(intentValue.fast)d-=.15;if(intentValue.calm)d+=.25;if(intentValue.trailer&&(r==='hook'||r==='reveal'))d-=.05;return clamp(d,.65,2.4);}
function fitDurationBudget(out,target){
  const effectiveTarget=clamp(target,out.length*.55,out.length*3);
  const total=out.reduce((s,c)=>s+c.rhythmDuration,0);
  if(total<=0)return;
  const factor=effectiveTarget/total;
  out.forEach(c=>{c.rhythmDuration=Number(clamp(c.rhythmDuration*factor,.55,3).toFixed(2));});
  for(let pass=0;pass<6;pass++){
    const sum=out.reduce((s,c)=>s+c.rhythmDuration,0);
    const diff=Number((effectiveTarget-sum).toFixed(4));
    if(Math.abs(diff)<.005)break;
    const eligible=out.filter(c=>diff>0?c.rhythmDuration<2.999:c.rhythmDuration>.551);
    if(!eligible.length)break;
    const step=diff/eligible.length;
    eligible.forEach(c=>{c.rhythmDuration=Number(clamp(c.rhythmDuration+step,.55,3).toFixed(2));});
  }
  const finalSum=out.reduce((s,c)=>s+c.rhythmDuration,0);
  const correction=Number((effectiveTarget-finalSum).toFixed(2));
  if(Math.abs(correction)>=.01){
    const last=out[out.length-1];
    last.rhythmDuration=Number(clamp(last.rhythmDuration+correction,.55,3).toFixed(2));
  }
}
export function planEditorialRhythm(cuts=[],{targetDuration=15,creativePrompt=''}={}){
  if(!Array.isArray(cuts)||!cuts.length)return[];
  const mode=intent(creativePrompt);
  const out=cuts.map((c,i)=>({...c,editorialRole:role(c,i,cuts.length),rhythmIndex:i,rhythmDuration:baseDuration(c,mode,i,cuts.length)}));
  fitDurationBudget(out,clamp(n(targetDuration,15),3,60));
  return out.map((c,i)=>{
    const r=c.editorialRole;
    let pacing=r==='hook'?'immediate':r==='action'?'driving':r==='reveal'?'controlled':r==='emotional'?'lingering':r==='hero'?'resolved':'building';
    if(mode.fast&&r==='action')pacing='driving-fast';
    if(mode.calm&&(r==='build'||r==='emotional'||r==='hero'))pacing='lingering';
    return{...c,pacing,beatPosition:i/(Math.max(1,out.length-1)),rhythmDuration:c.rhythmDuration};
  });
}
