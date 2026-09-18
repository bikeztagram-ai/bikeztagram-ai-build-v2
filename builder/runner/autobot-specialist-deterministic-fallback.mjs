#!/usr/bin/env node
/** Deterministic last-resort specialist fallback for the two active product lanes. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const assignmentPath=path.resolve(process.env.AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH||'builder/working/autobot-orchestrator-assignment.json');
const assignment=JSON.parse(fs.readFileSync(assignmentPath,'utf8'));
const specialist=assignment.specialist?.id;
const objective=String(assignment.objective?.title||'').toLowerCase();

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
if(specialist==='timeline-builder' && objective.includes('cadence-aware transition density')){
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
    "const hookPayoffBoost=(r==='hook'||r==='hero-ending')?evidence*.08:0;const qualityBoost=evidence*.16;const promptBoost=promptFit*.08;const finalScore=clamp(Math.round(roleScore+qualityBoost+hookPayoffBoost+promptBoost-diversityPenalty),0,100);",
    'evidence-weighted hook/payoff scoring'
  )];
} else {
  console.log(JSON.stringify({ok:false,status:'unsupported-objective',specialist,objective}));
  process.exit(2);
}
console.log(JSON.stringify({ok:true,engine:'deterministic-specialist-fallback-v1',specialist,objective,files}));
