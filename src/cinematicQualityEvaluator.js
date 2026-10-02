/* Deterministic real-output cinematic quality evaluator. Product layer only. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const text=v=>String(v??'').toLowerCase();
const roleOf=c=>text(c?.role||c?.editorialRole||c?.purpose||c?.intent);
const motionOf=c=>text(c?.motionStyle||c?.motion?.type);
const transitionOf=c=>text(c?.transition);
const describe=c=>text([c?.description,c?.reason,c?.action,c?.event,roleOf(c),c?.shotType,c?.composition,c?.framing].join(' '));

function scoreNarrative(cuts){
 let score=100;const issues=[];
 if(!cuts.length)return{score:0,issues:['No shots']};
 if(cuts.length<3){score-=20;issues.push('Too few story beats');}
 if(!['hook','opening','intro'].some(x=>roleOf(cuts[0]).includes(x))){score-=10;issues.push('Weak or unspecified opening hook');}
 const last=roleOf(cuts.at(-1));
 if(!/hero|ending|resolution|payoff|outro|final/.test(last)){score-=10;issues.push('Weak or unspecified ending payoff');}
 const roles=cuts.map(roleOf);
 const hasBuild=roles.some(r=>/build|anticipation|establish|setup/.test(r));
 const hasReveal=roles.some(r=>/reveal|showcase|unveil|hero|profile|product/.test(r));
 const hasAction=roles.some(r=>/action|escalation|chase|race|movement/.test(r));
 if(cuts.length>=4&&(!hasBuild||!hasReveal||!hasAction)){score-=18;issues.push('Narrative progression is under-specified');}
 return{score:clamp(Math.round(score),0,100),issues};
}
function scoreDiversity(cuts){
 if(!cuts.length)return{score:0,issues:['No shots']};
 const issues=[];let score=100;
 const families=new Set(cuts.map(c=>text(c.directorShotFamily||c.shotType||c.composition)).filter(Boolean));
 const motions=new Set(cuts.map(motionOf).filter(Boolean));
 const transitions=new Set(cuts.map(transitionOf).filter(Boolean));
 const descriptions=cuts.map(describe).filter(Boolean);
 if(cuts.length>2&&families.size<2){score-=15;issues.push('Low shot-family variety');}
 if(cuts.length>2&&motions.size<2){score-=15;issues.push('Low motion variety');}
 if(cuts.length>3&&transitions.size<2){score-=10;issues.push('Low transition variety');}
 for(let i=1;i<descriptions.length;i++)if(descriptions[i]===descriptions[i-1]){score-=12;issues.push('Adjacent duplicate shot description');break;}
 return{score:clamp(Math.round(score),0,100),issues};
}
function scorePacing(cuts,targetDuration){
 const issues=[];let score=100;const duration=cuts.reduce((s,c)=>s+n(c.duration),0);const target=n(targetDuration,0);
 if(duration<Math.max(3,target*.65)){score-=20;issues.push('Edit materially under target duration');}
 if(target&&Math.abs(duration-target)>Math.max(1.5,target*.12)){score-=12;issues.push('Edit duration materially misses target');}
 if(cuts.filter(c=>n(c.duration)>5).length>1){score-=10;issues.push('Multiple shots linger too long');}
 if(cuts.length>1){const avg=duration/cuts.length;if(avg>4){score-=8;issues.push('Pacing is likely too slow');}if(avg<.7){score-=8;issues.push('Pacing is likely too frantic');}}
 return{score:clamp(Math.round(score),0,100),issues};
}
function scoreAudio(cuts,render={}){
 const issues=[];let score=100;const audio=render.audio||{};const required=audio.required!==false;
 if(required&&audio.present!==true){score-=25;issues.push('Required audio is missing');}
 if(audio.durationAligned===false){score-=25;issues.push('Audio/video duration mismatch');}
 if(audio.beatAligned===false){score-=12;issues.push('Audio is not aligned to edit rhythm');}
 if(cuts.length>1){const beatCuts=cuts.filter(c=>c.nearestBeatTime!=null||c.beatAligned===true).length;if(audio.present&&beatCuts===0&&audio.beatAligned==null){score-=5;issues.push('No beat-boundary evidence');}}
 return{score:clamp(Math.round(score),0,100),issues};
}
function scoreRenderEvidence(render={}){
 const issues=[];let score=90;const qa=render.qa||render;
 const bytes=n(qa.blobBytes??qa.bytes,0);const width=n(qa.width,0),height=n(qa.height,0);const playback=n(qa.playbackProbeSeconds,0);const frame=qa.frameQA||{};const black=n(frame.blackFrameRatio,0);
 if(bytes>0&&bytes<1024){score-=35;issues.push('Rendered output is implausibly small');}
 if(('width' in qa||'height' in qa)&&(width<=0||height<=0)){score-=35;issues.push('Rendered output dimensions are missing');}
 if('playbackProbeSeconds' in qa&&playback<=0){score-=35;issues.push('Rendered output did not provide playback evidence');}
 if('frameQA' in qa&&black>=0.6){score-=35;issues.push('Rendered output contains excessive black-frame coverage');}
 if(qa.passed===false){score-=25;issues.push('Rendered-output QA reported failure');}
 return{score:clamp(Math.round(score),0,100),issues};
}
function scoreIntent(cuts,prompt=''){
 const p=text(prompt);if(!p)return{score:90,issues:[]};let score=100;const issues=[];
 const action=/action|fast|race|speed|chase|energetic|aggressive/.test(p);
 const reveal=/reveal|showcase|launch|unveil|introduc|product/.test(p);
 const dark=/dark|moody|night|dramatic|gritty|noir|myster/.test(p);
 const joined=cuts.map(describe).join(' ');
 if(action&&!/action|speed|race|chase|movement/.test(joined)){score-=15;issues.push('Creative brief asks for action but plan lacks action evidence');}
 if(reveal&&!/reveal|showcase|hero|profile|product/.test(joined)){score-=15;issues.push('Creative brief asks for a reveal but plan lacks reveal evidence');}
 if(dark&&!/dark|night|moody|dramatic|gritty|noir/.test(joined)&&!cuts.some(c=>/dark|moody|night|dramatic/.test(text(c.colorGrade)))){score-=8;issues.push('Dark/moody intent is not represented in plan metadata');}
 return{score:clamp(Math.round(score),0,100),issues};
}
export function evaluateCinematicOutput(plan={},renderMetadata={}){
 const cuts=Array.isArray(plan?.cuts)?plan.cuts:[];const target=n(plan?.targetDuration,0)||n(renderMetadata?.duration,0)||15;
 const parts={narrative:scoreNarrative(cuts),diversity:scoreDiversity(cuts),pacing:scorePacing(cuts,target),audio:scoreAudio(cuts,renderMetadata),intent:scoreIntent(cuts,plan?.creativePrompt),renderEvidence:scoreRenderEvidence(renderMetadata)};
 const weights={narrative:.23,diversity:.18,pacing:.18,audio:.14,intent:.17,renderEvidence:.1};
 const score=Math.round(Object.entries(parts).reduce((sum,[key,value])=>sum+value.score*weights[key],0));
 const issues=[...new Set(Object.values(parts).flatMap(p=>p.issues))];
 const verdict=parts.renderEvidence.score<50||score<80?'REJECT':score>=90?'PASS':'REVIEW';
 return{version:'cinematic-quality-v1',score,verdict,targetDuration:target,actualDuration:Number(cuts.reduce((s,c)=>s+n(c.duration),0).toFixed(2)),dimensions:parts,issues};
}
export function compareCinematicOutputs(before,after){const delta=n(after?.score)-n(before?.score);return{beforeScore:n(before?.score),afterScore:n(after?.score),delta,improved:delta>0,verdict:delta>0?'STRONGER':delta<0?'WEAKER':'UNCHANGED'};}
