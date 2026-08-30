/* BIKEZTAGRAM AI — Director decision -> executable render contract. */
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const text=(v,f='')=>String(v??f).trim();
const clamp=(v,min,max)=>Math.max(min,Math.min(max,num(v,min)));

export function buildExecutableDirectorCuts(decisions=[],options={}){
  const input=Array.isArray(decisions)?decisions:[];
  const target=clamp(options.targetDuration,1,120);
  if(!input.length)return [];
  const budget=target>0?target:15;
  const raw=input.map((d,i)=>({
    ...d,
    mediaIndex:Number.isInteger(Number(d.mediaIndex))?Number(d.mediaIndex):i,
    directorDecisionId:text(d.directorDecisionId)||`director-${i+1}`,
    role:text(d.role||d.editorialRole||d.directorStoryRole,'story-beat'),
    startTime:Math.max(0,num(d.startTime,0)),
    duration:clamp(d.duration,0.5,Math.min(8,budget)),
    transition:text(d.transition||d.transitionIn,'hard-cut'),
    motionStyle:text(d.motionStyle||d.motion?.type,'subtle-drift'),
    motionIntensity:clamp(d.motionIntensity ?? d.motion?.intensity,.35,1.5),
    cameraIntent:text(d.cameraIntent,'controlled-cinematic'),
    stabilization:d.stabilization!==false,
    speed:clamp(d.speed,0.5,1.5),
    colorGrade:text(d.colorGrade,'cinematic'),
    subjectType:text(d.subjectType||d.subject,'unknown')
  }));
  const output=[];let elapsed=0;
  for(const cut of raw){
    if(elapsed>=budget)break;
    const duration=Math.min(cut.duration,budget-elapsed);
    if(duration<0.5)break;
    output.push({...cut,startTime:Number(elapsed.toFixed(3)),duration:Number(duration.toFixed(3))});
    elapsed+=duration;
  }
  return output;
}

export function buildExecutableRenderPlan(decisions=[],options={}){
  const cuts=buildExecutableDirectorCuts(decisions,options);
  return {
    version:'director-executable-v1',
    title:text(options.title,'AI Cinematic Film'),
    style:text(options.style,'cinematic'),
    creativePrompt:text(options.creativePrompt),
    targetDuration:clamp(options.targetDuration,1,120),
    cuts,
    directorDriven:true
  };
}

export function validateExecutableDirectorPlan(plan){
  const cuts=Array.isArray(plan?.cuts)?plan.cuts:[];
  const failures=[];
  if(!cuts.length)failures.push('no-cuts');
  let end=0;
  const ids=new Set();
  for(const cut of cuts){
    if(ids.has(cut.directorDecisionId))failures.push('duplicate-decision-id');
    ids.add(cut.directorDecisionId);
    if(cut.duration<0.5)failures.push('duration-too-short');
    if(cut.startTime<end-.01)failures.push('timeline-overlap');
    if(cut.mediaIndex<0)failures.push('invalid-media-index');
    end=cut.startTime+cut.duration;
  }
  const target=num(plan?.targetDuration,0);
  if(target&&end>target+.05)failures.push('duration-budget-exceeded');
  return {ok:failures.length===0,failures,totalDuration:Number(end.toFixed(3)),cutCount:cuts.length};
}
