#!/usr/bin/env node
/**
 * Bikeztagram AutoBot — Aider-backed feature engineer.
 * Aider owns repository-map/edit/test execution; Bikeztagram owns objective,
 * scope, rollback, verification, production gates and review.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const run=(cmd,args,options={})=>spawnSync(cmd,args,{cwd:root,encoding:'utf8',stdio:'inherit',...options});
const protocol='aider-repo-map-v2';
const maxPasses=Math.max(1,Math.min(3,Number(process.env.AUTOBOT_FEATURE_PASSES||1)));
const model=process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL||'ollama_chat/qwen2.5-coder:7b';
const statePath=path.join(root,'builder/working/aider-feature-brain-state.json');
const objectives=JSON.parse(read('builder/brain/feature-objectives.json')).objectives||[];
const state=fs.existsSync(statePath)?JSON.parse(read('builder/working/aider-feature-brain-state.json')):{protocol,completed:[],failed:[],runs:0};

function objective(){
  const completed=new Set(state.completed||[]);
  return objectives.find(o=>o?.enabled!==false&&!completed.has(o.id)&&(!o.dependsOn||o.dependsOn.every(d=>completed.has(d))))||null;
}
function scopedFiles(obj){return Array.isArray(obj?.files)?obj.files.filter(Boolean):[];}
function promptFor(obj,pass){
  const files=scopedFiles(obj);
  return [
    'You are the Bikeztagram AI autonomous feature engineer.',
    `Objective: ${obj.title||obj.id}`,
    `Pass ${pass} of ${maxPasses}.`,
    `Acceptance criteria: ${JSON.stringify(obj.acceptance||[])}`,
    `Objective-scoped product files: ${files.join(', ')}`,
    `Objective constraints: ${JSON.stringify(obj.constraints||[])}`,
    'First inspect the repository and relevant callers/contracts. Make one coherent, real product-quality improvement for this objective.',
    'Treat the objective files above as the ONLY product files you may modify. Do not edit builder code, workflows, secrets, package/dependency manifests, generated output, or unrelated files.',
    'Preserve public contracts and all existing safety, scope, rollback, audit, production verification, and Gemini-free rules.',
    'Run the narrowest relevant verification and npm run build when practical. If a check fails, diagnose and repair it, then rerun the failed check.',
    'Do not merely describe changes: actually edit the files.',
    'Do not merge or create a pull request.'
  ].join('\\n');
}

const obj=objective();
if(!obj){console.log(JSON.stringify({ok:true,protocol,status:'no-eligible-objective'}));process.exit(0);}
let success=false;
for(let pass=1;pass<=maxPasses;pass++){
  state.runs=(state.runs||0)+1;
  const result=run('aider',[`--model=${model}`,'--yes-always','--no-auto-commits','--no-dirty-commits','--no-show-model-warnings','--message',promptFor(obj,pass)]);
  if(result.status!==0){state.failed=[...(state.failed||[]),{id:obj.id,pass,code:result.status}];continue;}
  try{execFileSync('git',['diff','--check'],{cwd:root,stdio:'inherit'});success=true;break;}catch{state.failed=[...(state.failed||[]),{id:obj.id,pass,code:'diff-check'}];}
}
if(success){state.completed=[...(state.completed||[]),obj.id];state.lastSuccess={id:obj.id,at:new Date().toISOString()};}
state.protocol=protocol;fs.mkdirSync(path.dirname(statePath),{recursive:true});fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
console.log(JSON.stringify({ok:success,protocol,objective:obj.id,passes:maxPasses,model}));
process.exit(success?0:1);
