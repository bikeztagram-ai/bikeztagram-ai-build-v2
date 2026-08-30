import { buildShotDirection, classifyMediaSubject } from './director.js';

const ROLES = ['hook','build','action','reveal','hero-ending'];
const TRANSITIONS = { hook:'fade-in', build:'hard-cut', action:'whip-right', reveal:'dip-black', 'hero-ending':'fade-out' };
const DURATIONS = { hook:2, build:3, action:3.2, reveal:3, 'hero-ending':3.8 };
const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
const number=(v,f)=>Number.isFinite(Number(v))?Number(v):f;

export function buildExecutableDirectorPlan({mediaItems=[],decisions=[],targetDuration=15,creativePrompt='',colorGrade='dark-cinematic'}={}){
  const items=Array.isArray(mediaItems)?mediaItems:[];
  const ranked=(Array.isArray(decisions)?decisions:[]).map((decision,index)=>({decision,index,score:number(decision?.score,0)})).sort((a,b)=>b.score-a.score);
  const selected=[];const used=new Set();const subjectCounts={};
  for(let i=0;i<ROLES.length;i++){
    const role=ROLES[i];
    const candidate=ranked.find(({decision})=>{const source=number(decision?.mediaIndex??decision?.sourceIndex,-1);if(!Number.isInteger(source)||source<0||source>=items.length||used.has(source))return false;const subject=String(decision?.subjectType||classifyMediaSubject(items[source])).toLowerCase();return !subjectCounts[subject]||i>=2;})||ranked.find(({decision})=>{const source=number(decision?.mediaIndex??decision?.sourceIndex,-1);return Number.isInteger(source)&&source>=0&&source<items.length&&!used.has(source);});
    if(!candidate)continue;
    const sourceIndex=number(candidate.decision.mediaIndex??candidate.decision.sourceIndex,0);const subject=String(candidate.decision.subjectType||classifyMediaSubject(items[sourceIndex])).toLowerCase();
    used.add(sourceIndex);subjectCounts[subject]=(subjectCounts[subject]||0)+1;
    const duration=clamp(number(candidate.decision.duration,DURATIONS[role]),.8,6);const direction=buildShotDirection({role,subjectType:subject,duration});const transition=candidate.decision.transition||TRANSITIONS[role];
    selected.push({mediaIndex:sourceIndex,mediaId:items[sourceIndex]?.id||`source-${sourceIndex}`,sourceType:'uploaded',generated:false,startTime:0,duration,purpose:role,role,transitionIn:transition,transition,motionStyle:candidate.decision.motionStyle||direction.motion.type,motionIntensity:clamp(number(candidate.decision.motionIntensity,1),.35,1.6),cameraIntent:candidate.decision.cameraIntent||direction.cameraIntent,subjectType:subject,colorGrade:candidate.decision.colorGrade||colorGrade,stabilization:candidate.decision.stabilization!==false,score:clamp(number(candidate.decision.score,0),0,100),directorDecisionId:candidate.decision.id||`director-${role}-${sourceIndex}`});
  }
  const budget=Math.max(1,number(targetDuration,15));const total=selected.reduce((sum,c)=>sum+c.duration,0);if(total>budget){const factor=budget/total;selected.forEach(c=>{c.duration=Math.max(.8,c.duration*factor);});}
  let cursor=0;selected.forEach(c=>{c.startTime=Number(cursor.toFixed(3));c.duration=Number(c.duration.toFixed(3));cursor+=c.duration;});
  return {version:'executable-director-v1',title:'Universal AI Film',style:'cinematic',creativePrompt,colorGrade,targetDuration:budget,cuts:selected,director:{coverageRoles:selected.map(c=>c.role),subjectCounts,decisionCount:selected.length,executionReady:true,totalDuration:Number(cursor.toFixed(3))}};
}

export function validateExecutableDirectorPlan(plan,mediaItems=[]){
  const cuts=Array.isArray(plan?.cuts)?plan.cuts:[];const errors=[];const seen=new Set();let previousEnd=0;let total=0;
  if(plan?.version!=='executable-director-v1')errors.push('wrong-version');
  if(!cuts.length)errors.push('no-cuts');
  cuts.forEach((cut,i)=>{
    const source=Number(cut.mediaIndex);if(!Number.isInteger(source)||source<0||source>=mediaItems.length)errors.push(`cut-${i}-invalid-source`);
    if(seen.has(source))errors.push(`cut-${i}-duplicate-source`);seen.add(source);
    if(!ROLES.includes(cut.role))errors.push(`cut-${i}-invalid-role`);
    if(!(Number(cut.duration)>=.8&&Number(cut.duration)<=6))errors.push(`cut-${i}-duration`);
    if(!cut.transition||!cut.motionStyle||!cut.cameraIntent)errors.push(`cut-${i}-missing-direction`);
    if(Math.abs(Number(cut.startTime)-previousEnd)>.02)errors.push(`cut-${i}-timeline-gap-or-overlap`);
    previousEnd=Number(cut.startTime)+Number(cut.duration);total=previousEnd;
  });
  const roles=cuts.map(c=>c.role);if(cuts.length>=3&&!roles.includes('hook'))errors.push('missing-hook');if(cuts.length>=3&&!roles.includes('hero-ending'))errors.push('missing-hero-ending');
  if(Number(plan?.targetDuration)>0&&total>Number(plan.targetDuration)+.05)errors.push('target-duration-exceeded');
  return {ok:errors.length===0,errors,totalDuration:Number(total.toFixed(3))};
}
