#!/usr/bin/env node
/**
 * Bikeztagram AutoBot — Aider-backed feature engineer.
 *
 * Aider supplies the mature repository-map/edit/test loop; Bikeztagram keeps
 * ownership of objectives, scope, rollback, production gates and PR review.
 * The product runtime remains provider-neutral and Gemini-free.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const run=(cmd,args,options={})=>spawnSync(cmd,args,{cwd:root,encoding:'utf8',stdio:'inherit',...options});
const protocol='aider-repo-map-v1';
const maxPasses=Math.max(1,Math.min(3,Number(process.env.AUTOBOT_FEATURE_PASSES||1)));
const model=process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL||'ollama_chat/qwen2.5-coder:7b';
const statePath=path.join(root,'builder/working/aider-feature-brain-state.json');
const objectives=JSON.parse(read('builder/brain/feature-objectives.json')).objectives||[];
const state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{protocol,completed:[],failed:[],runs:0};

function objective(){
  const completed=new Set(state.completed||[]);
  return objectives.find(o=>o?.enabled!==false&&!completed.has(o.id)&&(!o.dependencies||o.dependencies.every(d=>completed.has(d))))||null;
}
function allowedFiles(obj){return Array.isArray(obj?.allowedFiles)?obj.allowedFiles.filter(Boolean):[];}
function promptFor(obj,pass){
  const files=allowedFiles(obj);
  return [
    'You are the Bikeztagram AI autonomous feature engineer.',
    `Objective: ${obj.title||obj.id}`,
    `Pass ${pass} of ${maxPasses}.`,
    `Acceptance criteria: ${JSON.stringify(obj.acceptance||obj.criteria||[])}`,
    `Allowed product files: ${files.join(', ')||'(inspect objective and choose the smallest safe set)'}`,
    'First inspect the repository and relevant callers/contracts. Make one coherent, real product-quality improvement.',
    'Use the existing repository contract and do not weaken safety, scope, rollback, audit, production verification, or Gemini-free rules.',
    'Do not edit generated/build output, secrets, workflows, or unrelated files.',
    'After editing, run the narrowest relevant verification and npm run build when practical. If a check fails, repair it and rerun it.',
    'Do not merely describe changes: actually edit the files.',
    'Do not merge or create a pull request.',
    'Finish with a concise summary of files changed, checks run, and any remaining blocker.'
  ].join('\n');
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
