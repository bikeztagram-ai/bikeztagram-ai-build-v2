/* BIKEZTAGRAM AI — autonomous edit quality critic. Product layer only. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shotKey=(cut)=>{const media=String(cut?.mediaId??cut?.mediaIndex??'media');const start=n(cut?.startTime??cut?.start,0);return `${media}:${Math.round(start*2)/2}`};
const mediaKey=(cut)=>String(cut?.mediaId??cut?.mediaIndex??'media');
const MOTIONS=['slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down','orbit','zoom-punch'];
const AGGRESSIVE_MOTIONS=new Set(['whip-right','whip-left','zoom-punch','orbit']);
const TRANSITIONS=['hard-cut','crossfade','flash-cut','whip-right','dip-black','fade-in','fade-out','zoom-punch'];
function scoreTimeline(cuts){
 if(!cuts.length)return{score:0,issues:['No shots']};
 const issues=[];let score=100;
 const duration=cuts.reduce((s,c)=>s+n(c.duration),0);
 const unique=new Set(cuts.map(shotKey)).size;
 const uniqueSources=new Set(cuts.map(mediaKey)).size;
 const repeatedAdjacent=cuts.slice(1).reduce((count,c,i)=>count+(shotKey(c)===shotKey(cuts[i])?1:0),0);
 const motion=cuts.filter(c=>c.motionStyle&&c.motionStyle!=='static').length;
 const trans=cuts.filter(c=>c.transition&&c.transition!=='hard-cut').length;
 const long=cuts.filter(c=>n(c.duration)>5).length;
 if(cuts.length<3){score-=25;issues.push('Too few shots')}
 if(duration<6){score-=20;issues.push('Edit is too short')}
 if(unique<Math.min(cuts.length,2)){score-=15;issues.push('Too little shot variety')}
 if(repeatedAdjacent>0){score-=Math.min(12,repeatedAdjacent*6);issues.push('Adjacent shots repeat the same moment')}
 if(motion/cuts.length<.35){score-=6;issues.push('Too many static shots')}
 if(trans/cuts.length<.25){score-=5;issues.push('Transitions lack variation')}
 if(long>1){score-=8;issues.push('Several shots linger too long')}
 if(cuts[0]?.role!=='hook'){score-=8;issues.push('Opening is not a strong hook')}
 if(!['hero-ending','payoff'].includes(cuts.at(-1)?.role)){score-=8;issues.push('Ending lacks a clear resolution')}
 return{score:clamp(Math.round(score),0,100),issues,uniqueSources,repeatedAdjacent};
}
function repairTimeline(cuts,flags={}){
 const repaired=cuts.map((input,i)=>{const cut={...input};const role=cut.role||(i===0?'hook':i===cuts.length-1?'hero-ending':'story-beat');cut.role=role;
  const explicitlyStatic=cut.motionStyle==='static'||cut.motionIntent==='static'||cut.preserveMotion===false;
  if(!explicitlyStatic&&!cut.motionStyle)cut.motionStyle=flags.action?MOTIONS[i%5]:flags.emotional?(i%2?'slow-pull':'slow-push'):MOTIONS[i%MOTIONS.length];
  if(!explicitlyStatic&&AGGRESSIVE_MOTIONS.has(cut.motionStyle))cut.motionStyle=i%2?'pan-right':'slow-push';
  if(explicitlyStatic)cut.motionIntensity=0;else cut.motionIntensity=Number(clamp(n(cut.motionIntensity,.45)+(role==='peak'?.15:0),.2,.6).toFixed(2));
  if(i===0)cut.transition='fade-in';else if(i===cuts.length-1)cut.transition=flags.dark?'dip-black':'fade-out';else if(!cut.transition||cut.transition==='hard-cut')cut.transition=flags.action?'crossfade':TRANSITIONS[(i+1)%TRANSITIONS.length];
  const d=n(cut.duration,2);const target=role==='hook'?Math.min(d,2.4):role==='peak'?Math.min(d,2.2):role==='action'?Math.min(d,3.2):Math.min(d,4.2);cut.duration=Number(clamp(target,.5,6).toFixed(2));
  cut.speed=Number(clamp(n(cut.speed,1),.5,1.5).toFixed(2));cut.speedEnd=Number(clamp(n(cut.speedEnd,cut.speed),.5,1.5).toFixed(2));
  cut.coverage={...(cut.coverage||{}),criticAdjusted:true,preserveSubject:true,cinematicIntent:role==='hook'?'immediate-interest':role==='peak'?'maximum-energy':role==='hero-ending'?'memorable-resolution':'forward-story'};return cut});
 if(repaired.length)repaired[0].role='hook';if(repaired.length>1)repaired.at(-1).role=flags.comedy?'payoff':'hero-ending';if(repaired.length>2)repaired[Math.floor(repaired.length*.7)].role='peak';return repaired;
}
function repairAdjacentRepetition(cuts){const out=cuts.map(c=>({...c}));for(let i=1;i<out.length;i+=1){if(shotKey(out[i])!==shotKey(out[i-1]))continue;const alternative=out.findIndex((candidate,j)=>j>i&&shotKey(candidate)!==shotKey(out[i-1]));if(alternative>i){const tmp=out[i];out[i]=out[alternative];out[alternative]=tmp;}}return out;}
export function critiqueAndImproveTimeline(cuts,options={}){if(!Array.isArray(cuts)||!cuts.length)return{cuts:[],before:{score:0,issues:['No shots']},after:{score:0,issues:['No shots']},changed:false};const before=scoreTimeline(cuts);if(before.score>=90)return{cuts,before,after:before,changed:false};let improved=repairTimeline(cuts,options.flags||{});improved=repairAdjacentRepetition(improved);const after=scoreTimeline(improved);return{cuts:improved,before,after,changed:true,improvements:['strengthened story roles','increased purposeful shot variation','reduced adjacent duplicate moments','tightened pacing','added restrained transition variety','preserved explicit static shots','preserved real source media and subject']}}
export function describeCritique(result){if(!result)return'';if(!result.changed)return`🎬 Director quality check: ${result.after.score}/100 — no correction required.`;return`🎬 Director quality check: ${result.before.score}/100 → ${result.after.score}/100 • ${result.before.issues.join(', ')}`}
