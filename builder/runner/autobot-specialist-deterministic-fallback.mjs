#!/usr/bin/env node
/** Deterministic last-resort specialist fallback for the two active product lanes. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const assignmentPath=path.resolve(process.env.AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH||'builder/working/autobot-orchestrator-assignment.json');
const assignment=JSON.parse(fs.readFileSync(assignmentPath,'utf8'));
const specialist=assignment.specialist?.id;
const objective=String(assignment.objective?.title||'').toLowerCase();
const declaredFiles=new Set((assignment.objective?.files||[]).map(String));

function replaceOnce(file,search,replacement,label){
  const full=path.join(root,file);
  const src=fs.readFileSync(full,'utf8');
  if(!src.includes(search))throw new Error(`deterministic fallback anchor missing in ${file}: ${label}`);
  const next=src.replace(search,replacement);
  if(next===src)throw new Error(`deterministic fallback made no change: ${label}`);
  fs.writeFileSync(full,next);
  return file;
}

let files=[];
if(specialist==='director-builder' && objective.includes('prompt-sensitive role weighting')){
  files=[replaceOnce(
    'src/director.js',
    "const familyBonus=ROLE_FAMILY_WEIGHTS[r]?.[family]||0;if(familyBonus){score+=familyBonus;reasons.push(`${family} family +${familyBonus}`);}const subjectBonus=ROLE_SUBJECT_WEIGHTS[r]?.[subject]||0;",
    "const familyBonus=ROLE_FAMILY_WEIGHTS[r]?.[family]||0;if(familyBonus){score+=familyBonus;reasons.push(`${family} family +${familyBonus}`);}const intentBonus=(/action|fast|race|speed|chase|energetic/.test(lower(prompt))&&r==='action')?5:(/reveal|launch|unveil|showcase|hero/.test(lower(prompt))&&(r==='reveal'||r==='hero-ending'))?5:(/calm|peaceful|emotional|beautiful|romantic/.test(lower(prompt))&&(r==='build'||r==='emotional'))?4:0;if(intentBonus){score+=intentBonus;reasons.push(`creative intent +${intentBonus}`);}const subjectBonus=ROLE_SUBJECT_WEIGHTS[r]?.[subject]||0;",
    'prompt-sensitive role weighting'
  )];
} else if(specialist==='director-builder' && objective.includes('evidence-weighted subject diversity')){
  files=[replaceOnce(
    'src/director.js',
    "if(usedSubjects.has(subjectType)&&subjectType!=='unknown'){diversityPenalty+=5;reasons.push('subject repetition -5');}",
    "if(usedSubjects.has(subjectType)&&subjectType!=='unknown'){diversityPenalty+=9;reasons.push('subject repetition -9');}else if(subjectType!=='unknown'){diversityPenalty-=2;reasons.push('subject diversity +2');}",
    'evidence-weighted subject diversity'
  )];
} else if(specialist==='timeline-builder' && objective.includes('energy-aware motion intensity')){
  files=[replaceOnce(
    'src/executableTimeline.js',
    "cut.motionStyle=motionFor(cut,role);cut.motionIntensity=Number(clamp(number(cut.motionIntensity,1),.35,1.6).toFixed(2));",
    "const energyText=intentText(cut,plan);const energy=/action|chase|race|speed|impact|ride|drive|energetic|fast/.test(energyText)?1.25:/calm|peaceful|emotional|beautiful|romantic|ambient/.test(energyText)?.75:1;cut.motionIntensity=Number(clamp(number(cut.motionIntensity,1)*energy,.35,1.6).toFixed(2));",
    'energy-aware motion intensity'
  )];
} else if(specialist==='timeline-builder' && (objective.includes('timing')||objective.includes('motion')||objective.includes('transition'))){
  files=[replaceOnce(
    'src/executableTimeline.js',
    "cut.motionStyle=motionFor(cut,role);cut.motionIntensity=Number(clamp(number(cut.motionIntensity,1),.35,1.6).toFixed(2));",
    "const roleMotion=role==='action'?1.2:role==='reveal'?1.08:role==='hero-ending'?.9:1;cut.motionStyle=motionFor(cut,role);cut.motionIntensity=Number(clamp(number(cut.motionIntensity,1)*roleMotion,.35,1.6).toFixed(2));",
    'purposeful role-aware motion intensity'
  )];
} else if(specialist==='timeline-builder' && objective.includes('source-aware trim continuity')){
  files=[replaceOnce(
    'src/executableTimeline.js',
    "const end=Number.isFinite(endRaw)&&endRaw>start?endRaw:start+duration;return{trimStart:Number(start.toFixed(3)),trimEnd:Number(end.toFixed(3))};",
    "const available=number(cut?.sourceDuration,number(cut?.durationInSeconds,NaN));const proposed=Number.isFinite(endRaw)&&endRaw>start?endRaw:start+duration;const end=Number.isFinite(available)&&available>0?Math.max(start,Math.min(proposed,available)):proposed;return{trimStart:Number(start.toFixed(3)),trimEnd:Number(end.toFixed(3))};",
    'source-aware trim continuity'
  )];
} else if(specialist==='timeline-builder' && objective.includes('cadence-aware transition density')){
  files=[replaceOnce(
    'src/executableTimeline.js',
    "function transitionFor(cut,index,total,plan){if(cut?.transition&&cut.transition!=='hard-cut')return cut.transition;if(index===0)return'fade-in';",
    "function transitionFor(cut,index,total,plan){if(cut?.transition&&cut.transition!=='hard-cut')return cut.transition;const cadenceDuration=number(cut?.duration,2);if(index>0&&index<total-1){if(cadenceDuration<=.8)return index%2?'whip-right':'hard-cut';if(cadenceDuration>=2.2)return'emotional-crossfade';}if(index===0)return'fade-in';",
    'duration-aware transition density'
  )];
} else if(specialist==='director-builder' && objective.includes('adaptive hook-to-payoff shot scoring')){
  files=[replaceOnce(
    'src/director.js',
    "const qualityBoost=evidence*.16;const promptBoost=promptFit*.08;const finalScore=clamp(Math.round(roleScore+qualityBoost+promptBoost-diversityPenalty),0,100);",
    "const hookPayoffBoost=(role==='hook'||role==='hero-ending')?evidence*.08:0;const qualityBoost=evidence*.16;const promptBoost=promptFit*.08;const finalScore=clamp(Math.round(roleScore+qualityBoost+hookPayoffBoost+promptBoost-diversityPenalty),0,100);",
    'evidence-weighted hook/payoff scoring'
  )];
} else if(specialist==='director-builder'){
  const options=[
    ["const hookPayoffBoost=(role==='hook'||role==='hero-ending')?evidence*.08:0;const qualityBoost=evidence*.16;const promptBoost=promptFit*.08;","const hookPayoffBoost=(role==='hook'||role==='hero-ending')?evidence*.12:0;const qualityBoost=evidence*.16;const promptBoost=promptFit*.08;","generic director hook/payoff evidence"],
    ["if(usedFamilies.has(family)&&family!=='unknown'){diversityPenalty+=9;","if(usedFamilies.has(family)&&family!=='unknown'){diversityPenalty+=11;","generic director family diversity"],
    ["if(usedSubjects.has(subjectType)&&subjectType!=='unknown'){diversityPenalty+=5;","if(usedSubjects.has(subjectType)&&subjectType!=='unknown'){diversityPenalty+=7;","generic director subject diversity"]
  ];
  for(const [search,replacement,label] of options){
    try{files=[replaceOnce('src/director.js',search,replacement,label)];break;}catch{}
  }
  if(!files.length){console.log(JSON.stringify({ok:false,status:'unsupported-objective',specialist,objective}));process.exit(2);}
} else if(specialist==='timeline-builder'){
  if(!declaredFiles.has('src/executableTimeline.js')){
    console.log(JSON.stringify({ok:false,status:'unsupported-objective-file',specialist,objective,declaredFiles:[...declaredFiles]}));
    process.exit(2);
  }
  const options=[
    ["cut.motionStyle=motionFor(cut,role);cut.motionIntensity=Number(clamp(number(cut.motionIntensity,1),.35,1.6).toFixed(2));","cut.motionStyle=motionFor(cut,role);const roleMotion=role==='action'?1.15:role==='reveal'?1.06:role==='hero-ending'?.92:1;cut.motionIntensity=Number(clamp(number(cut.motionIntensity,1)*roleMotion,.35,1.6).toFixed(2));","generic timeline role-aware motion"],
    ["const end=Number.isFinite(endRaw)&&endRaw>start?endRaw:start+duration;return{trimStart:Number(start.toFixed(3)),trimEnd:Number(end.toFixed(3))};","const available=number(cut?.sourceDuration,number(cut?.durationInSeconds,NaN));const proposed=Number.isFinite(endRaw)&&endRaw>start?endRaw:start+duration;const end=Number.isFinite(available)&&available>0?Math.max(start,Math.min(proposed,available)):proposed;return{trimStart:Number(start.toFixed(3)),trimEnd:Number(end.toFixed(3))};","generic timeline source-aware trim"],
    ["function transitionFor(cut,index,total,plan){if(cut?.transition&&cut.transition!=='hard-cut')return cut.transition;if(index===0)return'fade-in';","function transitionFor(cut,index,total,plan){if(cut?.transition&&cut.transition!=='hard-cut')return cut.transition;const cadenceDuration=number(cut?.duration,2);if(index>0&&index<total-1&&cadenceDuration<=.8)return index%2?'whip-right':'hard-cut';if(index===0)return'fade-in';","generic timeline cadence transition"]
  ];
  for(const [search,replacement,label] of options){
    try{files=[replaceOnce('src/executableTimeline.js',search,replacement,label)];break;}catch{}
  }
  if(!files.length){console.log(JSON.stringify({ok:false,status:'unsupported-objective',specialist,objective}));process.exit(2);}
} else {
  console.log(JSON.stringify({ok:false,status:'unsupported-objective',specialist,objective}));
  process.exit(2);
}
console.log(JSON.stringify({ok:true,engine:'deterministic-specialist-fallback-v1',specialist,objective,files}));
