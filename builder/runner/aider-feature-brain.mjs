#!/usr/bin/env node
/**
 * Bikeztagram AutoBot — Aider-backed feature engineer.
 * Aider owns repository-aware edit/test execution; Bikeztagram owns objective,
 * scope, rollback, verification, production gates and review.
 *
 * Successful passes are durable checkpoints. If the run expires during a later
 * pass, that later pass is rolled back while earlier verified passes remain,
 * and the same objective resumes on the next run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { loadAiderState, saveAiderState } from './aider-state-store.mjs';

const root=process.cwd();
const run=(cmd,args,options={})=>spawnSync(cmd,args,{cwd:root,encoding:'utf8',stdio:'inherit',...options});
const protocol='aider-repo-map-v3';
const maxPasses=Math.max(1,Math.min(3,Number(process.env.AUTOBOT_FEATURE_PASSES||1)));
const model=process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL||'ollama_chat/qwen2.5-coder:7b';
const requestedMinutes=Math.max(1,Number.parseInt(process.env.BUILDER_MAX_MINUTES||'15',10));
const configuredDeadline=Number.parseInt(process.env.AUTOBOT_FEATURE_DEADLINE_EPOCH_MS||'',10);
const deadline=Number.isFinite(configuredDeadline)&&configuredDeadline>Date.now()?configuredDeadline:Date.now()+requestedMinutes*60_000;
const normalDeadline=Number.parseInt(process.env.AUTOBOT_FEATURE_NORMAL_DEADLINE_EPOCH_MS||String(deadline),10);
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
const loadedState=loadAiderState(statePath,{protocol,completed:[],failed:[],runs:0,inProgress:null});
const state=loadedState.state;
if(loadedState.recovered){
  console.warn(`[aider] recovered persistent state from ${loadedState.source}; continuing safely instead of aborting.`);
}

function remainingMs(){return Math.max(0,deadline-Date.now());}
function normalRemainingMs(){return Math.max(0,normalDeadline-Date.now());}
function objective(){
  const completed=new Set(state.completed||[]);
  const resumeId=state.inProgress?.id;
  if(resumeId){
    const resumed=objectives.find(o=>o?.id===resumeId&&o?.enabled!==false&&!completed.has(o.id));
    if(resumed)return resumed;
  }
  return objectives.find(o=>o?.enabled!==false&&!completed.has(o.id)&&(!o.dependsOn||o.dependsOn.every(d=>completed.has(d))))||null;
}
function scopedFiles(obj){return Array.isArray(obj?.files)?obj.files.filter(Boolean):[];}
function promptFor(obj,pass){
  const files=scopedFiles(obj);
  const completedPasses=state.inProgress?.id===obj.id?Number(state.inProgress.completedPasses||0):0;
  return [
    'You are the Bikeztagram AI autonomous feature engineer.',
    `Objective: ${obj.title||obj.id}`,
    `Pass ${pass} of ${maxPasses}.`,
    completedPasses>0?`This objective is being resumed after ${completedPasses} verified pass(es). Preserve those changes and continue the unfinished portion; do not redo completed work.`:'This objective is new in this worker state.',
    `Acceptance criteria: ${JSON.stringify(obj.acceptance||[])}`,
    `Objective-scoped product files: ${files.join(', ')}`,
    `Objective constraints: ${JSON.stringify(obj.constraints||[])}`,
    'Inspect the supplied product files and their relevant callers/contracts as needed. Make one coherent, real product-quality improvement for this objective.',
    'The supplied objective files are the ONLY files you may modify. Do not modify any other path, including builder code, workflows, .gitignore, secrets, package/dependency manifests, generated output, or unrelated files.',
    'Preserve public contracts and all existing safety, scope, rollback, audit, production verification, and Gemini-free rules.',
    'Run the narrowest relevant verification. Do not merely describe changes: actually edit the supplied files.',
    'Do not merge or create a pull request.'
  ].join('\n');
}
function trackedPaths(){
  try{return execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);}catch{return[];}
}
function snapshotFiles(files){
  const snapshot=path.join(root,'builder','working',`aider-pass-snapshot-${process.pid}.patch`);
  fs.mkdirSync(path.dirname(snapshot),{recursive:true});
  try{const patch=execFileSync('git',['diff','--binary','--',...files],{cwd:root,encoding:'utf8'});fs.writeFileSync(snapshot,patch);return snapshot;}catch{return snapshot;}
}
function restorePassSnapshot(obj,snapshot){
  for(const file of scopedFiles(obj)){
    try{execFileSync('git',['restore','--worktree','--',file],{cwd:root,stdio:'inherit'});}catch{}
    try{execFileSync('git',['clean','-fd','--',file],{cwd:root,stdio:'inherit'});}catch{}
  }
  try{if(fs.existsSync(snapshot)&&fs.statSync(snapshot).size>0)execFileSync('git',['apply','--whitespace=nowarn',snapshot],{cwd:root,stdio:'inherit'});}catch(error){console.error(`[aider] failed to restore pass snapshot: ${error.message}`);}
  try{fs.unlinkSync(snapshot);}catch{}
}
function discardSnapshot(snapshot){try{fs.unlinkSync(snapshot);}catch{}}
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
const priorCompletedPasses=state.inProgress?.id===obj.id?Math.max(0,Number(state.inProgress.completedPasses||0)):0;
const firstPass=Math.min(maxPasses,priorCompletedPasses+1);
let success=false;
for(let pass=firstPass;pass<=maxPasses;pass++){
  const remaining=remainingMs();
  if(remaining<35_000){console.error('[aider] hard feature deadline reached before next pass; continuation checkpoint remains durable.');break;}
  if(normalRemainingMs()<35_000&&pass>firstPass){console.error('[aider] normal work deadline reached; no new pass will start, existing objective checkpoint will resume next run.');break;}
  state.runs=(state.runs||0)+1;
  const before=new Set(trackedPaths());
  const snapshot=snapshotFiles(files);
  const timeout=Math.min(perCallMaxMs,Math.max(30_000,remaining-5_000));
  const apiTimeout=Math.max(30,Math.floor(timeout/1000));
  const args=[`--model=${model}`,`--timeout=${apiTimeout}`,'--yes-always','--no-auto-commits','--no-dirty-commits','--no-gitignore','--no-show-model-warnings','--map-tokens=512','--subtree-only','--message',promptFor(obj,pass),...aiderFiles];
  const result=spawnSync('aider',args,{cwd:aiderCwd,encoding:'utf8',stdio:'inherit',timeout});
  if(result.error){
    console.error(`[aider] pass ${pass} stopped: ${result.error.code||result.error.message}; rolling back only this pass`);
    restorePassSnapshot(obj,snapshot);
    state.failed=[...(state.failed||[]),{id:obj.id,pass,code:result.error.code||'process-error'}];
    saveAiderState(statePath,state);
    if(remainingMs()<35_000)break;
    continue;
  }
  if(result.status!==0){
    console.error(`[aider] pass ${pass} exited ${result.status}; rolling back only this pass`);
    restorePassSnapshot(obj,snapshot);
    state.failed=[...(state.failed||[]),{id:obj.id,pass,code:result.status}];
    saveAiderState(statePath,state);
    continue;
  }
  try{
    assertScope(before,obj);
    verifyDiff();
    verifyBuild();
    state.inProgress={id:obj.id,completedPasses:pass,lastVerifiedAt:new Date().toISOString(),remainingPasses:Math.max(0,maxPasses-pass)};
    saveAiderState(statePath,state);
    discardSnapshot(snapshot);
    success=pass>=maxPasses;
    if(success)break;
    if(normalRemainingMs()<35_000)break;
  }catch(error){
    console.error(`[aider] pass ${pass} verification failed: ${error.message}; rolling back only this pass`);
    restorePassSnapshot(obj,snapshot);
    state.failed=[...(state.failed||[]),{id:obj.id,pass,code:'verification',error:error.message}];
    saveAiderState(statePath,state);
    if(remainingMs()<35_000)break;
  }
}
if(success){
  state.completed=[...(state.completed||[]),obj.id];
  state.lastSuccess={id:obj.id,at:new Date().toISOString()};
  state.inProgress=null;
}else if(state.inProgress?.id===obj.id){
  state.inProgress={...state.inProgress,remainingPasses:Math.max(0,maxPasses-Number(state.inProgress.completedPasses||0)),checkpointedAt:new Date().toISOString()};
}
state.protocol=protocol;
state.lastRunAt=new Date().toISOString();
saveAiderState(statePath,state);
console.log(JSON.stringify({ok:success,protocol,objective:obj.id,passes:maxPasses,startingPass:firstPass,model,elapsedMs:(requestedMinutes*60_000)-remainingMs(),remainingMs:remainingMs(),normalRemainingMs:normalRemainingMs(),resumable:!success&&state.inProgress?.id===obj.id,stateRecovery:loadedState.recovered?loadedState.source:null}));
process.exit(success?0:1);