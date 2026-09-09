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
const protocol='aider-repo-map-v4-controlled-self-improvement';
const maxPasses=Math.max(1,Math.min(3,Number(process.env.AUTOBOT_FEATURE_PASSES||1)));
const model=process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL||'ollama_chat/qwen2.5-coder:7b';
const requestedMinutes=Math.max(1,Number.parseInt(process.env.BUILDER_MAX_MINUTES||'15',10));
const configuredDeadline=Number.parseInt(process.env.AUTOBOT_FEATURE_DEADLINE_EPOCH_MS||'',10);
const deadline=Number.isFinite(configuredDeadline)&&configuredDeadline>Date.now()?configuredDeadline:Date.now()+requestedMinutes*60_000;
const perCallMaxMs=Math.max(30_000,Number.parseInt(process.env.AUTOBOT_AIDER_CALL_TIMEOUT_MS||String(6*60*60*1000),10));
const statePath=path.join(root,'builder/working/aider-feature-brain-state.json');
const hardProtectedPrefixes=[
  'builder/brain/feature-objectives.json',
  'builder/quality/',
  '.github/workflows/',
  'scripts/autobot/verify-',
  'scripts/autobot/run-production-gate.mjs',
  'package.json'
];

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
  const eligible=objectives.filter(o=>o?.enabled!==false&&!completed.has(o.id)&&(!o.dependsOn||o.dependsOn.every(d=>completed.has(d))));
  return eligible.sort((a,b)=>(Number(b?.priority)||0)-(Number(a?.priority)||0))[0]||null;
}
function scopedFiles(obj){return Array.isArray(obj?.files)?obj.files.filter(Boolean):[];}
function allowNewFiles(obj){return obj?.kind==='self-improvement'&&Array.isArray(obj?.allowNewFiles)?obj.allowNewFiles.filter(Boolean):[];}
function protectedPaths(obj){
  const declared=Array.isArray(obj?.protectedPaths)?obj.protectedPaths.filter(Boolean):[];
  return [...new Set([...hardProtectedPrefixes,...declared])];
}
function isProtected(file,obj){return protectedPaths(obj).some(prefix=>file===prefix||file.startsWith(prefix));}
function allowedPaths(obj){return new Set([...scopedFiles(obj),...allowNewFiles(obj)]);}
function promptFor(obj,pass){
  const files=scopedFiles(obj);
  const newFiles=allowNewFiles(obj);
  const protectedList=protectedPaths(obj);
  const self=obj.kind==='self-improvement';
  return [
    'You are the Bikeztagram AI autonomous feature engineer.',
    `Objective: ${obj.title||obj.id}`,
    `Objective kind: ${obj.kind||'product'}.`,
    `Pass ${pass} of ${maxPasses}.`,
    `Acceptance criteria: ${JSON.stringify(obj.acceptance||[])}`,
    `Objective-scoped product files: ${files.join(', ')||'(none)'}`,
    `Explicitly allowlisted new files: ${newFiles.join(', ')||'(none)'}`,
    `Protected paths: ${protectedList.join(', ')}`,
    `Objective constraints: ${JSON.stringify(obj.constraints||[])}`,
    'Inspect the supplied files and their relevant callers/contracts as needed. Make one coherent, real engineering improvement for this objective.',
    self
      ? 'This is a controlled self-improvement task. You may improve the autonomous feature-engineering mechanism itself, but you must not weaken or remove any safety, scope, rollback, audit, production, verification, or protected-path control. You may create a new file only when its exact path appears in the explicit allowlist.'
      : 'This is a product task. Do not modify the autonomous builder, workflows, safety controls, or infrastructure.',
    'Only the supplied objective files and explicitly allowlisted new files may be modified. Protected paths are read-only.',
    'Do not widen the objective scope, change the objective definition, change protected-path policy, or grant yourself additional files.',
    'Preserve public contracts, the Gemini-free rule, local/provider-neutral product runtime, rollback/verification gates, and no-auto-commit behavior.',
    'Run the narrowest relevant verification. Do not merely describe changes: actually edit the allowed files.',
    'Do not merge or create a pull request.'
  ].join('\\n');
}
function trackedPaths(){
  try{return execFileSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd:root,encoding:'utf8'}).split(/\\r?\\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);}catch{return[];}
}
function restorePath(file){
  try{execFileSync('git',['restore','--',file],{cwd:root,stdio:'inherit'});}catch{}
  try{execFileSync('git',['clean','-fd','--',file],{cwd:root,stdio:'inherit'});}catch{}
}
function assertScope(before,obj){
  const allowed=allowedPaths(obj);
  const after=trackedPaths();
  const changed=after.filter(p=>!before.has(p));
  const unauthorized=changed.filter(p=>!allowed.has(p));
  const protectedChanged=after.filter(p=>isProtected(p,obj));
  const violations=[...new Set([...unauthorized,...protectedChanged])];
  if(violations.length){
    console.error(`[aider] scope/protection violation: ${violations.join(', ')}`);
    for(const file of violations)restorePath(file);
    throw new Error(`Aider modified files outside objective scope or inside a protected path: ${violations.join(', ')}`);
  }
  if(obj.kind==='self-improvement'){
    const selfFiles=changed.filter(p=>p.startsWith('builder/runner/'));
    const disallowedSelfFiles=selfFiles.filter(p=>!allowed.has(p));
    if(disallowedSelfFiles.length){for(const file of disallowedSelfFiles)restorePath(file);throw new Error(`Self-improvement created or changed non-allowlisted runner files: ${disallowedSelfFiles.join(', ')}`);}
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
const newFiles=allowNewFiles(obj);
if(!files.length&&!newFiles.length){console.error(`[aider] objective ${obj.id} has no editable files`);process.exit(1);}
const aiderScope=[...files,...newFiles];
const useSrcSubtree=aiderScope.length>0&&aiderScope.every(file=>file.startsWith('src/'));
const aiderCwd=useSrcSubtree?path.join(root,'src'):root;
const aiderFiles=useSrcSubtree?aiderScope.map(file=>file.slice(4)):aiderScope;
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
    if(obj.kind==='self-improvement')execFileSync('npm',['run','verify:autobot-self-improvement-boundary'],{cwd:root,stdio:'inherit'});
    verifyBuild();
    success=true;
    break;
  }catch(error){
    console.error(`[aider] pass ${pass} verification failed: ${error.message}`);
    state.failed=[...(state.failed||[]),{id:obj.id,pass,code:'verification',error:error.message}];
    if(remainingMs()<35_000)break;
  }
}
if(success){state.completed=[...(state.completed||[]),obj.id];state.lastSuccess={id:obj.id,kind:obj.kind||'product',at:new Date().toISOString()};}
state.protocol=protocol;
fs.mkdirSync(path.dirname(statePath),{recursive:true});
fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\\n');
console.log(JSON.stringify({ok:success,protocol,objective:obj.id,kind:obj.kind||'product',passes:maxPasses,model,elapsedMs:(requestedMinutes*60_000)-remainingMs(),remainingMs:remainingMs()}));
process.exit(success?0:1);
