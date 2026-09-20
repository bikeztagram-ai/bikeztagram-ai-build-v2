/* BIKEZTAGRAM AI — safe director-to-render execution normalizer.
   Keeps source identity while making editorial timing, motion, transitions and
   render handoff deterministic and provider-neutral. */
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const number=(value,fallback)=>{const n=Number(value);return Number.isFinite(n)?n:fallback;};
const text=(value)=>String(value??'').toLowerCase();
const sourceId=(cut)=>cut?.mediaId!=null&&String(cut.mediaId).trim()?String(cut.mediaId):Number.isInteger(Number(cut?.mediaIndex))?`media:${Number(cut.mediaIndex)}`:cut?.sourceId?String(cut.sourceId):'unknown';
const intentText=(cut,plan)=>text([cut?.purpose,cut?.intent,cut?.role,cut?.editorialRole,plan?.creativePrompt].join(' '));
function roleFor(index,total,plan){const explicit=text(plan?.cuts?.[index]?.editorialRole||plan?.cuts?.[index]?.role);if(explicit)return explicit;if(index===0)return'hook';if(index===total-1)return'hero-ending';const p=intentText(plan?.cuts?.[index]||{},plan);if(/reveal|unveil|showcase/.test(p))return'reveal';if(/action|chase|race|speed|impact|ride|drive/.test(p))return'action';if(/build|approach|journey|setup/.test(p))return'build';return'story-beat';}

function validateMotionIntensity(motionIntensity) {
  return Number.isFinite(motionIntensity) && motionIntensity >= 0.35 && motionIntensity <= 1.6;
}
function motionFor(cut,role){if(cut?.motionStyle&&cut.motionStyle!=='static')return cut.motionStyle;const s=text([cut?.purpose,cut?.intent,role].join(' '));if(/action|chase|race|speed|impact|ride|drive/.test(s))return role==='action'?'zoom-punch':'pan-right';if(role==='hook')return'slow-push';if(role==='hero-ending')return'slow-pull';if(/reveal|showcase|detail/.test(s))return'slow-push';return'pan-right';}

function validateMotionIntensity(motionIntensity) {
  return Number.isFinite(motionIntensity) && motionIntensity >= 0.35 && motionIntensity <= 1.6;
}
function transitionFor(cut,index,total,plan){if(cut?.transition&&cut.transition!=='hard-cut')return cut.transition;const cadenceDuration=number(cut?.duration,2);if(index>0&&index<total-1){if(cadenceDuration<=.8)return index%2?'whip-right':'hard-cut';if(cadenceDuration>=2.2)return'emotional-crossfade';}if(index===0)return'fade-in';if(index===total-1)return text(plan?.creativePrompt).includes('dark')?'dip-black':'fade-out';const s=intentText(cut,plan);const duration=normalizeDuration(cut);const energetic=/action|chase|race|speed|impact/.test(s);const reveal=/reveal|showcase|detail/.test(s);if(energetic){if(duration<=1)return index%2?'whip-right':'zoom-punch';if(duration>=2.75)return'crossfade';return index%2?'whip-right':'hard-cut';}if(reveal){if(duration<=1.25)return'zoom-punch';if(duration>=2.75)return'crossfade';return'whip-right';}if(/emotional|beautiful|romantic/.test(s))return'crossfade';if(duration<=.9)return index%2?'whip-right':'zoom-punch';if(duration>=3.25)return'crossfade';return index%3===0?'whip-right':'hard-cut';}

function validateMotionIntensity(motionIntensity) {
  return Number.isFinite(motionIntensity) && motionIntensity >= 0.35 && motionIntensity <= 1.6;
}
function normalizeDuration(cut){return Number(clamp(number(cut?.duration,2),.5,6).toFixed(3));}

function validateMotionIntensity(motionIntensity) {
  return Number.isFinite(motionIntensity) && motionIntensity >= 0.35 && motionIntensity <= 1.6;
}
function normalizeTrim(cut){const start=Math.max(0,number(cut?.trimStart,number(cut?.start,0)));const endRaw=number(cut?.trimEnd,number(cut?.end,NaN));const duration=normalizeDuration(cut);const available=number(cut?.sourceDuration,number(cut?.durationInSeconds,NaN));const proposed=Number.isFinite(endRaw)&&endRaw>start?endRaw:start+duration;const end=Number.isFinite(available)&&available>0?Math.max(start,Math.min(proposed,available)):proposed;return{trimStart:Number(start.toFixed(3)),trimEnd:Number(end.toFixed(3))};}

function validateMotionIntensity(motionIntensity) {
  return Number.isFinite(motionIntensity) && motionIntensity >= 0.35 && motionIntensity <= 1.6;
}
function normalizeTransform(cut){const t=cut?.transform||{};return{scale:Number(clamp(number(t.scale,1),.5,3).toFixed(3)),x:Number(clamp(number(t.x,0),-1,1).toFixed(3)),y:Number(clamp(number(t.y,0),-1,1).toFixed(3)),rotation:Number(clamp(number(t.rotation,0),-180,180).toFixed(2))};}

function validateMotionIntensity(motionIntensity) {
  return Number.isFinite(motionIntensity) && motionIntensity >= 0.35 && motionIntensity <= 1.6;
}
function normalizeTimelineDuration(cuts,target){if(!cuts.length)return cuts;const desired=clamp(number(target,15),1,120);const sum=cuts.reduce((s,c)=>s+c.duration,0);if(!sum)return cuts;const factor=desired/sum;const weighted=cuts.map(c=>{const raw=c.duration*factor;return{...c,duration:Number(clamp(raw,.5,6).toFixed(3)),_fraction:raw};});let delta=Number((desired-weighted.reduce((s,c)=>s+c.duration,0)).toFixed(3));const order=[...weighted.keys()].sort((a,b)=>weighted[b]._fraction-weighted[a]._fraction);for(const i of order){if(Math.abs(delta)<.001)break;const next=Number(clamp(weighted[i].duration+delta,.5,6).toFixed(3));delta=Number((delta-(next-weighted[i].duration)).toFixed(3));weighted[i].duration=next;}return weighted.map(({_fraction,...c})=>c);}

function validateMotionIntensity(motionIntensity) {
  return Number.isFinite(motionIntensity) && motionIntensity >= 0.35 && motionIntensity <= 1.6;
}
export function buildExecutableTimeline(plan,{targetDuration=15}={}){const sourceCuts=Array.isArray(plan?.cuts)?plan.cuts:Array.isArray(plan?.scenes)?plan.scenes:[];if(!sourceCuts.length)return{...plan,cuts:[],targetDuration};const total=sourceCuts.length;let cuts=sourceCuts.map((raw,index)=>{const cut={...raw};const role=roleFor(index,total,plan);const source=sourceId(cut);const trim=normalizeTrim(cut);cut.role=cut.role||role;cut.editorialRole=cut.editorialRole||role;cut.motionStyle=motionFor(cut,role);const roleMotion=role==='action'?1.15:role==='reveal'?1.06:role==='hero-ending'?.92:1;cut.motionIntensity=Number(clamp(number(cut.motionIntensity,1)*roleMotion,.35,1.6).toFixed(2));cut.transition=transitionFor(cut,index,total,plan);cut.duration=normalizeDuration(cut);cut.speed=Number(clamp(number(cut.speed,1),.5,1.75).toFixed(2));cut.speedEnd=Number(clamp(number(cut.speedEnd,cut.speed),.5,1.75).toFixed(2));cut.trimStart=trim.trimStart;cut.trimEnd=trim.trimEnd;cut.transform=normalizeTransform(cut);cut.sourceType=cut.sourceType||'uploaded';cut.directorExecution={...(cut.directorExecution||{}),sourceId:source,role,motionStyle:cut.motionStyle,motionIntensity:cut.motionIntensity,transition:cut.transition,duration:cut.duration,speed:cut.speed,speedEnd:cut.speedEnd,trimStart:trim.trimStart,trimEnd:trim.trimEnd,transform:cut.transform,preserveDirectorMedia:true};return cut;});
cuts=normalizeTimelineDuration(cuts,plan?.targetDuration??targetDuration);cuts=cuts.map(c=>({...c,directorExecution:{...c.directorExecution,duration:c.duration}}));return{...plan,cuts,targetDuration:Number(clamp(number(plan?.targetDuration,targetDuration),1,120).toFixed(2)),executionVersion:'director-execution-v2'};}

function validateMotionIntensity(motionIntensity) {
  return Number.isFinite(motionIntensity) && motionIntensity >= 0.35 && motionIntensity <= 1.6;
}
export function validateExecutableTimeline(plan){const cuts=Array.isArray(plan?.cuts)?plan.cuts:[];const failures=[];if(!cuts.length)failures.push('no-cuts');cuts.forEach((cut,index)=>{if(sourceId(cut)==='unknown'&&!cut.generated)failures.push(`cut-${index}-missing-source`);if(!cut.role)failures.push(`cut-${index}-missing-role`);if(!cut.motionStyle)failures.push(`cut-${index}-missing-motion`);if(!cut.transition)failures.push(`cut-${index}-missing-transition`);if(number(cut.duration,0)<=0)failures.push(`cut-${index}-invalid-duration`);if(number(cut.trimEnd,0)<=number(cut.trimStart,0))failures.push(`cut-${index}-invalid-trim`);if(number(cut.speed,0)<=0||number(cut.speedEnd,0)<=0)failures.push(`cut-${index}-invalid-speed`);});return{passed:failures.length===0,failures};}

function validateMotionIntensity(motionIntensity) {
  return Number.isFinite(motionIntensity) && motionIntensity >= 0.35 && motionIntensity <= 1.6;
}
