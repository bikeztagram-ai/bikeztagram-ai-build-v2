#!/usr/bin/env node
/**
 * Bikeztagram AutoBot — Aider-backed feature engineer.
 * Aider owns repository-aware edit/test execution; Bikeztagram owns objective,
 * scope, rollback, verification, production gates and review.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const run=(cmd,args,options={})=>spawnSync(cmd,args,{cwd:root,encoding:'utf8',stdio:'inherit',...options});
const protocol='aider-repo-map-v3';
const maxPasses=Math.max(1,Math.min(3,Number(process.env.AUTOBOT_FEATURE_PASSES||1)));
const model=process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL||'ollama_chat/qwen2.5-coder:7b';
const requestedMinutes=Math.max(1,Number.parseInt(process.env.BUILDER_MAX_MINUTES||'15',10));
const configuredDeadline=Number.parseInt(process.env.AUTOBOT_FEATURE_DEADLINE_EPOCH_MS||'',10);
const deadline=Number.isFinite(configuredDeadline)&&configuredDeadline>Date.now()?configuredDeadline:Date.now()+requestedMinutes*60_000;
const perCallMaxMs=Math.max(30_000,Number.parseInt(process.env.AUTOBOT_AIDER_CALL_TIMEOUT_MS||String(6*60*60*1000),10));
const statePath=path.join(root,'builder/working/aider-feature-brain-state.json');

function loadObjectives(){
  const file=path.join(root,'builder/brain/feature-objectives.json');
  try{return JSON.parse(fs.readFileSync(file,'utf8')).objectives||[];}
  catch(error){
    try{
      const changed=execFileSync('git',['status','--short','--','builder/brain/feature-objectives.json'],{cwd:root,encoding:'utf8'}).trim();
      if(changed){
        console.error('[aider] protected feature-objectives.json was modified/corrupted; restoring tracked version.');
        execFileSync('git',['restore','--','builder/brain/feature-objectives.json'],{cwd:root,stdio:'inherit'});
        return JSON.parse(fs.readFileSync(file,'utf8')).objectives||[];
      }
    }catch{}
    throw new Error(`feature objectives JSON is invalid and could not be safely restored: ${error.message}`);
  }
}

const objectives=loadObjectives();
const state=fs.existsSync(statePath)?JSON.parse(read('builder/working/aider-feature-brain-state.json')):{protocol,completed:[],failed:[],runs:0};

function remainingMs(){return Math.max(0,deadline-Date.now());}
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
    'Inspect the supplied product files and their relevant callers/contracts as needed. Make one coherent, real product-quality improvement for this objective.',
    'The supplied objective files are the ONLY files you may modify. Do not modify any other path, including builder code, workflows, .gitignore, secrets, package/dependency manifests, generated output, or unrelated files.',
    'Preserve public contracts and all existing safety, scope, rollback, audit, production verification, and Gemini-free rules.',
    'Run the narrowest relevant verification. Do not merely describe changes: actually edit the supplied files.',
    'Do not merge or create a pull request.'
  ].join('\\n');
}
function trackedPaths(){
  try{return execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).split(/\\r?\\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);}catch{return[];}
}
function assertScope(before,obj){
  const allowed=new Set(scopedFiles(obj));
  const after=trackedPaths();
  const newPaths=after.filter(p=>!before.has(p));
  const unauthorized=newPaths.filter(p=>!allowed.has(p));
  if(unauthorized.length){
    console.error(`[aider] unauthorized modified paths: ${unauthorized.join(', ')}`);
    for(const file of unauthorized){
      try{execFileSync('git',['restore','--',file],{cwd:root,stdio:'inherit'});}catch{}
      try{execFileSync('git',['clean','-fd','--',file],{cwd:root,stdio:'inherit'});}catch{}
    }
    throw new Error(`Aider modified files outside objective scope: ${unauthorized.join(', ')}`);
  }
}
function verifyDiff(){execFileSync('git',['diff','--check'],{cwd:root,stdio:'inherit'});}
function verifyBuild(){
  const remaining=remainingMs();
  if(remaining<35_000)throw new Error('insufficient remaining run budget for build verification');
  const result=run('npm',['run','build'],{timeout:Math.min(120_000,remaining-5_000)});
  if(result.error||result.status!==0)throw new Error(`npm run build failed with status ${result.status??'error'}`);
}

const obj=objective();
if(!obj){console.log(JSON.stringify({ok:true,protocol,status:'no-eligible-objective'}));process.exit(0);}
const files=scopedFiles(obj);
if(!files.length){console.error(`[aider] objective ${obj.id} has no scoped files`);process.exit(1);}
const useSrcSubtree=files.every(file=>file.startsWith('src/'));
const aiderCwd=useSrcSubtree?path.join(root,'src'):root;
const aiderFiles=useSrcSubtree?files.map(file=>file.slice(4)):files;
let success=false;
for(let pass=1;pass<=maxPasses;pass++){
  const remaining=remainingMs();
  if(remaining<35_000){console.error('[aider] feature deadline reached before next pass');break;}
  state.runs=(state.runs||0)+1;
  const before=new Set(trackedPaths());
  const timeout=Math.min(perCallMaxMs,remaining-5_000);
  const apiTimeout=Math.max(30,Math.floor(timeout/1000));
  const args=[`--model=${model}`,`--timeout=${apiTimeout}`,'--yes-always','--no-auto-commits','--no-dirty-commits','--no-gitignore','--no-show-model-warnings','--map-tokens=512','--subtree-only','--message',promptFor(obj,pass),...aiderFiles];
  const result=spawnSync('aider',args,{cwd:aiderCwd,encoding:'utf8',stdio:'inherit',timeout});
  if(result.error){
    console.error(`[aider] pass ${pass} stopped: ${result.error.code||result.error.message}`);
    state.failed=[...(state.failed||[]),{id:obj.id,pass,code:result.error.code||'process-error'}];
    if(remainingMs()<35_000)break;
    continue;
  }
  if(result.status!==0){state.failed=[...(state.failed||[]),{id:obj.id,pass,code:result.status}];continue;}
  try{
    assertScope(before,obj);
    verifyDiff();
    verifyBuild();
    success=true;
    break;
  }catch(error){
    console.error(`[aider] pass ${pass} verification failed: ${error.message}`);
    state.failed=[...(state.failed||[]),{id:obj.id,pass,code:'verification',error:error.message}];
    if(remainingMs()<35_000)break;
  }
}
if(success){state.completed=[...(state.completed||[]),obj.id];state.lastSuccess={id:obj.id,at:new Date().toISOString()};}
state.protocol=protocol;
fs.mkdirSync(path.dirname(statePath),{recursive:true});
fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\\n');
console.log(JSON.stringify({ok:success,protocol,objective:obj.id,passes:maxPasses,model,elapsedMs:(requestedMinutes*60_000)-remainingMs(),remainingMs:remainingMs()}));
process.exit(success?0:1);
