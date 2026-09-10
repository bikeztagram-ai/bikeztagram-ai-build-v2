#!/usr/bin/env node
/**
 * Bikeztagram AI — Aider-backed feature engineer.
 * Aider performs repository-aware editing; Bikeztagram owns objective selection,
 * bounded scope, rollback, verification, learning feedback and production gates.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { buildSelfImprovementBrief } from './self-improvement-planner.mjs';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const run=(cmd,args,options={})=>spawnSync(cmd,args,{cwd:root,encoding:'utf8',stdio:'inherit',...options});
const protocol='aider-repo-map-v5-learning';
const maxPasses=Math.max(1,Math.min(3,Number(process.env.AUTOBOT_FEATURE_PASSES||1)));
const model=process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL||'ollama_chat/qwen2.5-coder:7b';
const requestedMinutes=Math.max(1,Number.parseInt(process.env.BUILDER_MAX_MINUTES||'15',10));
const configuredDeadline=Number.parseInt(process.env.AUTOBOT_FEATURE_DEADLINE_EPOCH_MS||'',10);
const deadline=Number.isFinite(configuredDeadline)&&configuredDeadline>Date.now()?configuredDeadline:Date.now()+requestedMinutes*60_000;
const perCallMaxMs=Math.max(30_000,Number.parseInt(process.env.AUTOBOT_AIDER_CALL_TIMEOUT_MS||String(6*60*60*1000),10));
const statePath=path.join(root,'builder/working/aider-feature-brain-state.json');
const learningPath=path.join(root,'builder/working/aider-feature-brain-learning.json');
const hardProtectedPrefixes=[
  'builder/brain/feature-objectives.json','builder/quality/','.github/workflows/',
  'scripts/autobot/verify-','scripts/autobot/run-production-gate.mjs','package.json'
];

function loadObjectives(){
  const file=path.join(root,'builder/brain/feature-objectives.json');
  try{return JSON.parse(fs.readFileSync(file,'utf8')).objectives||[];}
  catch(error){
    try{
      const changed=execFileSync('git',['status','--short','--','builder/brain/feature-objectives.json'],{cwd:root,encoding:'utf8'}).trim();
      if(changed){execFileSync('git',['restore','--','builder/brain/feature-objectives.json'],{cwd:root,stdio:'inherit'});return JSON.parse(fs.readFileSync(file,'utf8')).objectives||[];}
    }catch{}
    throw new Error(`feature objectives JSON is invalid and could not be safely restored: ${error.message}`);
  }
}
function loadJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
const objectives=loadObjectives();
const state=loadJson(statePath,{protocol,completed:[],failed:[],runs:0});
const learning=loadJson(learningPath,{schemaVersion:1,failures:[],successes:[],runs:0});
function remainingMs(){return Math.max(0,deadline-Date.now());}
function objective(){
  const completed=new Set(state.completed||[]);
  const eligible=objectives.filter(o=>o?.enabled!==false&&!completed.has(o.id)&&(!o.dependsOn||o.dependsOn.every(d=>completed.has(d))));
  return eligible.sort((a,b)=>(Number(b?.priority)||0)-(Number(a?.priority)||0))[0]||null;
}
function scopedFiles(obj){return Array.isArray(obj?.files)?obj.files.filter(Boolean):[];}
function allowNewFiles(obj){return obj?.kind==='self-improvement'&&Array.isArray(obj?.allowNewFiles)?obj.allowNewFiles.filter(Boolean):[];}
function protectedPaths(obj){const declared=Array.isArray(obj?.protectedPaths)?obj.protectedPaths.filter(Boolean):[];return [...new Set([...hardProtectedPrefixes,...declared])];}
function isProtected(file,obj){return protectedPaths(obj).some(prefix=>file===prefix||file.startsWith(prefix));}
function allowedPaths(obj){return new Set([...scopedFiles(obj),...allowNewFiles(obj)]);}
function trackedPaths(){try{return execFileSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);}catch{return[];}}
function restorePath(file){try{execFileSync('git',['restore','--',file],{cwd:root,stdio:'inherit'});}catch{}try{execFileSync('git',['clean','-fd','--',file],{cwd:root,stdio:'inherit'});}catch{}}
function recentLearning(obj){const failures=(learning.failures||[]).filter(x=>x.objective===obj.id).slice(-6);const successes=(learning.successes||[]).filter(x=>x.objective===obj.id).slice(-4);return{failures,successes};}
function promptFor(obj,pass){
  const files=scopedFiles(obj),newFiles=allowNewFiles(obj),protectedList=protectedPaths(obj),self=obj.kind==='self-improvement';
  const feedback=recentLearning(obj);
  const learningBrief=self?buildSelfImprovementBrief(learning):null;
  return [
    'You are the Bikeztagram AI autonomous feature engineer.',
    `Objective: ${obj.title||obj.id}`,
    `Objective kind: ${obj.kind||'product'}.`,
    `Pass ${pass} of ${maxPasses}.`,
    `Acceptance criteria: ${JSON.stringify(obj.acceptance||[])}`,
    `Objective-scoped files: ${files.join(', ')||'(none)'}`,
    `Explicitly allowlisted new files: ${newFiles.join(', ')||'(none)'}`,
    `Protected paths: ${protectedList.join(', ')}`,
    `Objective constraints: ${JSON.stringify(obj.constraints||[])}`,
    self?`Self-improvement evidence and lessons: ${JSON.stringify(learningBrief)}`:`Relevant prior run feedback: ${JSON.stringify(feedback)}`,
    'Inspect the supplied files and relevant callers/contracts as needed. Make one coherent, real engineering improvement for this objective.',
    self?'This is a controlled self-improvement task. Improve the autonomous engineering mechanism using the recorded evidence. Do not weaken any safety, scope, rollback, audit, production, verification, protected-path or no-auto-commit control.':'This is a product task. Do not modify the autonomous builder, workflows, safety controls or infrastructure.',
    'Only objective files and explicitly allowlisted new files may be modified. Protected paths are read-only.',
    'Do not widen objective scope, alter objective definitions, alter protected-path policy, or grant additional permissions.',
    'Preserve public contracts, Gemini-free/provider-neutral product runtime, rollback and verification gates.',
    'Run the narrowest relevant verification. Actually edit the allowed files; do not merely describe a solution.',
    'If previous feedback identifies a failure, explicitly address that failure or add a guard/test that prevents recurrence.',
    'Do not merge or create a pull request.'
  ].join('\n');
}
function assertScope(before,obj){
  const allowed=allowedPaths(obj),after=trackedPaths();
  const changed=after.filter(p=>!before.has(p));
  const violations=[...new Set([...changed.filter(p=>!allowed.has(p)),...after.filter(p=>isProtected(p,obj))])];
  if(violations.length){for(const file of violations)restorePath(file);throw new Error(`scope/protection violation: ${violations.join(', ')}`);}
}
function verifyDiff(){execFileSync('git',['diff','--check'],{cwd:root,stdio:'inherit'});}
function verifyBuild(){const remaining=remainingMs();if(remaining<35_000)throw new Error('insufficient remaining run budget for build verification');const result=run('npm',['run','build'],{timeout:Math.min(120_000,remaining-5_000)});if(result.error||result.status!==0)throw new Error(`npm run build failed with status ${result.status??'error'}`);}
function classifyFailure(error){const message=String(error?.message||error||'unknown failure').toLowerCase();if(message.includes('scope')||message.includes('protected'))return'scope-violation';if(message.includes('build'))return'build-failure';if(message.includes('diff'))return'diff-failure';if(message.includes('boundary'))return'boundary-failure';if(message.includes('timeout'))return'timeout';return'verification-failure';}
function recordFailure(obj,pass,error){learning.failures=[...(learning.failures||[]),{objective:obj.id,kind:obj.kind||'product',pass,category:classifyFailure(error),message:String(error?.message||error).slice(0,500),at:new Date().toISOString()}].slice(-100);}
function recordSuccess(obj,pass,before){const changed=trackedPaths().filter(p=>!before.has(p));learning.successes=[...(learning.successes||[]),{objective:obj.id,kind:obj.kind||'product',pass,changedPaths:changed,at:new Date().toISOString()}].slice(-100);}
function persist(){fs.mkdirSync(path.dirname(statePath),{recursive:true});state.protocol=protocol;state.updatedAt=new Date().toISOString();fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');fs.writeFileSync(learningPath,JSON.stringify({...learning,schemaVersion:1,updatedAt:new Date().toISOString()},null,2)+'\n');}

const obj=objective();
if(!obj){console.log(JSON.stringify({ok:true,protocol,status:'no-eligible-objective'}));process.exit(0);}
const files=scopedFiles(obj),newFiles=allowNewFiles(obj),aiderScope=[...files,...newFiles];
if(!aiderScope.length){console.error(`[aider] objective ${obj.id} has no editable files`);process.exit(1);}
const useSrcSubtree=aiderScope.every(file=>file.startsWith('src/'));
const aiderCwd=useSrcSubtree?path.join(root,'src'):root;
const aiderFiles=useSrcSubtree?aiderScope.map(file=>file.slice(4)):aiderScope;
let success=false;
for(let pass=1;pass<=maxPasses;pass++){
  if(remainingMs()<35_000)break;
  state.runs=(state.runs||0)+1;learning.runs=(learning.runs||0)+1;
  const before=new Set(trackedPaths());
  const timeout=Math.min(perCallMaxMs,remainingMs()-5_000);
  const apiTimeout=Math.max(30,Math.floor(timeout/1000));
  const args=[`--model=${model}`,`--timeout=${apiTimeout}`,'--yes-always','--no-auto-commits','--no-dirty-commits','--no-gitignore','--no-show-model-warnings','--map-tokens=512','--subtree-only','--message',promptFor(obj,pass),...aiderFiles];
  const result=spawnSync('aider',args,{cwd:aiderCwd,encoding:'utf8',stdio:'inherit',timeout});
  if(result.error){const error=new Error(result.error.code||result.error.message);recordFailure(obj,pass,error);state.failed=[...(state.failed||[]),{id:obj.id,pass,code:result.error.code||'process-error'}];persist();continue;}
  if(result.status!==0){const error=new Error(`Aider exited with status ${result.status}`);recordFailure(obj,pass,error);state.failed=[...(state.failed||[]),{id:obj.id,pass,code:result.status}];persist();continue;}
  try{
    assertScope(before,obj);verifyDiff();
    if(obj.kind==='self-improvement')execFileSync('npm',['run','verify:autobot-self-improvement-boundary'],{cwd:root,stdio:'inherit'});
    verifyBuild();
    recordSuccess(obj,pass,before);success=true;break;
  }catch(error){
    console.error(`[aider] pass ${pass} verification failed: ${error.message}`);recordFailure(obj,pass,error);
    state.failed=[...(state.failed||[]),{id:obj.id,pass,code:'verification',error:String(error.message).slice(0,500)}];persist();
    if(remainingMs()<35_000)break;
  }
}
if(success){state.completed=[...(state.completed||[]),obj.id];state.lastSuccess={id:obj.id,kind:obj.kind||'product',at:new Date().toISOString()};}
persist();
console.log(JSON.stringify({ok:success,protocol,objective:obj.id,kind:obj.kind||'product',passes:maxPasses,model,elapsedMs:(requestedMinutes*60_000)-remainingMs(),remainingMs:remainingMs(),learningFailures:(learning.failures||[]).length,learningSuccesses:(learning.successes||[]).length}));
process.exit(success?0:1);
