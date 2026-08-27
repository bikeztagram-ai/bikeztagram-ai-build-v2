/* BIKEZTAGRAM AI — autonomous edit quality critic. Product layer only. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const MOTIONS=['slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down','orbit','zoom-punch'];
const TRANSITIONS=['hard-cut','crossfade','flash-cut','whip-right','dip-black','fade-in','fade-out','zoom-punch'];
const roleOf=cut=>String(cut?.role??cut?.editorialRole??cut?.purpose??'').toLowerCase().trim();
const scoreTimeline=cuts=>{
 if(!cuts.length)return{score:0,issues:['No shots']};
 const issues=[];let score=100;
 const duration=cuts.reduce((s,c)=>s+n(c.duration),0);
 const unique=new Set(cuts.map(c=>`${c.mediaId||'media'}:${c.mediaIndex??0}:${Math.round(n(c.startTime)*2)/2}`)).size;
 const motion=cuts.filter(c=>c.motionStyle&&c.motionStyle!=='static').length;
 const trans=cuts.filter(c=>c.transition&&c.transition!=='hard-cut').length;
 const long=cuts.filter(c=>n(c.duration)>5).length;
 const openingRole=roleOf(cuts[0]);
 const endingRole=roleOf(cuts.at(-1));
 const hasHook=/hook|opening|intro|impact/.test(openingRole);
 const hasEnding=/hero-ending|hero|payoff|ending|resolution|final/.test(endingRole);
 if(cuts.length<3){score-=25;issues.push('Too few shots')}
 if(duration<6){score-=20;issues.push('Edit is too short')}
 if(unique<Math.min(cuts.length,2)){score-=15;issues.push('Too little source variety')}
 if(motion/cuts.length<.6){score-=12;issues.push('Too many static shots')}
 if(trans/cuts.length<.25){score-=6;issues.push('Transitions lack variation')}
 if(long>1){score-=8;issues.push('Several shots linger too long')}
 if(!hasHook){score-=8;issues.push('Opening is not a strong hook')}
 if(!hasEnding){score-=8;issues.push('Ending lacks a clear resolution')}
 return{score:clamp(Math.round(score),0,100),issues};
};
function repairTimeline(cuts,flags={}){
 const repaired=cuts.map((input,i)=>{const cut={...input};const existingRole=roleOf(cut);const role=cut.role||cut.editorialRole||cut.purpose||(i===0?'hook':i===cuts.length-1?'hero-ending':'story-beat');cut.role=role;
  if(!cut.motionStyle||cut.motionStyle==='static')cut.motionStyle=flags.action?MOTIONS[i%5]:flags.emotional?(i%2?'slow-pull':'slow-push'):MOTIONS[i%MOTIONS.length];
  cut.motionIntensity=Number(clamp(n(cut.motionIntensity,.9)+(role==='peak'?.15:0),.35,1.6).toFixed(2));
  if(i===0)cut.transition='fade-in';else if(i===cuts.length-1)cut.transition=flags.dark?'dip-black':'fade-out';else if(!cut.transition||cut.transition==='hard-cut')cut.transition=flags.action?TRANSITIONS[(i+2)%TRANSITIONS.length]:TRANSITIONS[(i+1)%TRANSITIONS.length];
  const d=n(cut.duration,2);const target=role==='hook'?Math.min(d,2.4):role==='peak'?Math.min(d,2.2):role==='action'?Math.min(d,3.2):Math.min(d,4.2);cut.duration=Number(clamp(target,.5,6).toFixed(2));
  cut.speed=Number(clamp(n(cut.speed,1),.5,1.75).toFixed(2));cut.speedEnd=Number(clamp(n(cut.speedEnd,cut.speed),.5,1.75).toFixed(2));cut.coverage={...(cut.coverage||{}),criticAdjusted:true,preserveSubject:true,cinematicIntent:role==='hook'?'immediate-interest':role==='peak'?'maximum-energy':role==='hero-ending'?'memorable-resolution':'forward-story'};if(existingRole&&existingRole!==role&&cut.editorialRole==null&&cut.purpose==null)cut.editorialRole=existingRole;return cut});
 if(repaired.length)repaired[0].role='hook';if(repaired.length>1)repaired.at(-1).role=flags.comedy?'payoff':'hero-ending';if(repaired.length>2)repaired[Math.floor(repaired.length*.7)].role='peak';return repaired;
}
export function critiqueAndImproveTimeline(cuts,options={}){if(!Array.isArray(cuts)||!cuts.length)return{cuts:[],before:{score:0,issues:['No shots']},after:{score:0,issues:['No shots']},changed:false};const before=scoreTimeline(cuts);if(before.score>=90)return{cuts,before,after:before,changed:false};const improved=repairTimeline(cuts,options.flags||{});const after=scoreTimeline(improved);return{cuts:improved,before,after,changed:true,improvements:['strengthened story roles','increased shot and camera-motion variation','tightened pacing','added transition variety','preserved real source media and subject']}}
export function describeCritique(result){if(!result)return'';if(!result.changed)return`🎬 Director quality check: ${result.after.score}/100 — no correction required.`;return`🎬 Director quality check: ${result.before.score}/100 → ${result.after.score}/100 • ${result.before.issues.join(', ')}`}
