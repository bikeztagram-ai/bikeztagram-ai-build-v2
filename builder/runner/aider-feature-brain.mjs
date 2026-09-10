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
const run=(cmd,args,options={})=>spawnSync(cmd,args,{cwd:root,encoding:'utf8',stdio:'inherit',...options});
const protocol='aider-repo-map-v7-bounded-learning';
const maxPasses=Math.max(1,Math.min(3,Number(process.env.AUTOBOT_FEATURE_PASSES||1)));
const model=process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL||'ollama_chat/qwen2.5-coder:7b';
const requestedMinutes=Math.max(1,Number.parseInt(process.env.BUILDER_MAX_MINUTES||'15',10));
const configuredDeadline=Number.parseInt(process.env.AUTOBOT_FEATURE_DEADLINE_EPOCH_MS||'',10);
const deadline=Number.isFinite(configuredDeadline)&&configuredDeadline>Date.now()?configuredDeadline:Date.now()+requestedMinutes*60_000;
const configuredCallMax=Math.max(60_000,Number.parseInt(process.env.AUTOBOT_AIDER_CALL_TIMEOUT_MS||String(6*60*1000),10));
const reserveMs=Math.max(30_000,Number.parseInt(process.env.AUTOBOT_VERIFICATION_RESERVE_MS||'60_000',10));
const learningPath=path.join(root,'builder/working/aider-feature-brain-learning.json');
const statePath=path.join(root,'builder/working/aider-feature-brain-state.json');
const runtimePrefixes=['.aider.chat.history.md','.aider.input.history','.aider.tags.cache.v4/','builder/working/aider-feature-brain-learning.json','builder/working/aider-feature-brain-state.json','builder/working/autobot-audit.jsonl','builder/working/long-run-state.json','autobot-self-evolution-evidence/'];
const hardProtectedPrefixes=['builder/brain/feature-objectives.json','builder/runner/autobot-evolution-policy.json','builder/quality/','.github/workflows/','scripts/autobot/verify-','scripts/autobot/run-production-gate.mjs','package.json'];
function loadObjectives(){const file=path.join(root,'builder','brain','feature-objectives.json');try{return JSON.parse(fs.readFileSync(file,'utf8')).objectives||[];}catch(error){try{execFileSync('git',['restore','--','builder/brain/feature-objectives.json'],{cwd:root,stdio:'inherit'});return JSON.parse(fs.readFileSync(file,'utf8')).objectives||[];}catch{}throw new Error(`feature objectives JSON is invalid: ${error.message}`);}}
function loadJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
const objectives=loadObjectives();
const state=loadJson(statePath,{protocol,completed:[],failed:[],runs:0});
const learning=loadJson(learningPath,{schemaVersion:1,failures:[],successes:[],runs:0});
function remainingMs(){return Math.max(0,deadline-Date.now());}
function objective(){const completed=new Set(state.completed||[]);const eligible=objectives.filter(o=>o?.enabled!==false&&!completed.has(o.id)&&(!o.dependsOn||o.dependsOn.every(d=>completed.has(d))));return eligible.sort((a,b)=>(Number(b?.priority)||0)-(Number(a?.priority)||0))[0]||null;}
function scopedFiles(obj){return Array.isArray(obj?.files)?obj.files.filter(Boolean):[];}
function allowNewFiles(obj){return obj?.kind==='self-improvement'&&Array.isArray(obj?.allowNewFiles)?obj.allowNewFiles.filter(Boolean):[];}
function protectedPaths(obj){return [...new Set([...hardProtectedPrefixes,...(Array.isArray(obj?.protectedPaths)?obj.protectedPaths.filter(Boolean):[])])];}
function isProtected(file,obj){return protectedPaths(obj).some(prefix=>file===prefix||file.startsWith(prefix));}
function allowedPaths(obj){return new Set([...scopedFiles(obj),...allowNewFiles(obj)]);}
function safeRelative(file){return typeof file==='string'&&file.length>0&&!path.isAbsolute(file)&&!file.split('/').includes('..');}
function validateObjective(obj){const files=scopedFiles(obj),newFiles=allowNewFiles(obj);for(const file of [...files,...newFiles])if(!safeRelative(file))throw new Error(`unsafe objective path: ${file}`);for(const file of files)if(!fs.existsSync(path.join(root,file)))throw new Error(`objective file missing: ${file}`);for(const file of protectedPaths(obj))if(!safeRelative(file))throw new Error(`unsafe protected path: ${file}`);}
function isRuntimeArtifact(file){return runtimePrefixes.some(prefix=>file===prefix||file.startsWith(prefix));}
function trackedPaths(){try{return execFileSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean).filter(file=>!isRuntimeArtifact(file));}catch{return[];}}
function restorePath(file){try{execFileSync('git',['restore','--',file],{cwd:root,stdio:'inherit'});}catch{}try{execFileSync('git',['clean','-fd','--',file],{cwd:root,stdio:'inherit'});}catch{}}
function rollbackAttempt(before){const beforeSet=new Set(before);for(const file of trackedPaths().filter(p=>!beforeSet.has(p)))restorePath(file);}
function recentLearning(obj){return{failures:(learning.failures||[]).filter(x=>x.objective===obj.id).slice(-4),successes:(learning.successes||[]).filter(x=>x.objective===obj.id).slice(-3)};}
function promptFor(obj,pass,attemptMs){const files=scopedFiles(obj),newFiles=allowNewFiles(obj),self=obj.kind==='self-improvement',feedback=recentLearning(obj),learningBrief=self?buildSelfImprovementBrief(learning):null,focus=process.env.AUTOBOT_FEATURE_FOCUS||'';const compactLearning=self?{recommendedNextAction:learningBrief?.recommendedNextAction,highestPriorityLearning:learningBrief?.highestPriorityLearning,latestFailure:learningBrief?.latestFailure,efficiencySignals:learningBrief?.efficiencySignals}:feedback;return ['You are the Bikeztagram AI autonomous feature engineer.',`Objective: ${obj.title||obj.id}`,`Objective kind: ${obj.kind||'product'}.`,`Pass ${pass} of ${maxPasses}.`,`Hard execution budget: ${Math.round(attemptMs/1000)} seconds. Make the smallest complete improvement that can be implemented and verified within it.`,`Primary coding model policy: use the strongest configured local coding model for substantive engineering; do not trade away correctness merely to reduce startup or inference time.`,focus?`RUN FOCUS: ${focus}`:'',`Acceptance criteria: ${JSON.stringify(obj.acceptance||[])}`,`Objective-scoped files: ${files.join(', ')||'(none)'}`,`Explicitly allowlisted new files: ${newFiles.join(', ')||'(none)'}`,`Protected paths: ${protectedPaths(obj).join(', ')}`,`Constraints: ${JSON.stringify(obj.constraints||[])}`,self?`Self-improvement evidence: ${JSON.stringify(compactLearning)}`:`Prior run feedback: ${JSON.stringify(compactLearning)}`,'Inspect the supplied files and only the relevant callers/contracts. Make one coherent, real engineering improvement.',self?'This is a controlled self-improvement task. Use the evidence to improve the autonomous engineering mechanism. Address repeated timeout/no-progress behaviour when supported by evidence. Do not weaken safety, scope, rollback, audit, production, verification, protected-path or no-auto-commit controls.':'This is a product task. Do not modify autonomous-builder infrastructure or safety controls.','Only objective files and explicitly allowlisted new files may be modified. Protected paths are read-only.','Do not widen objective scope, alter objective definitions, alter protected-path policy, or grant permissions.','Preserve public contracts, Gemini-free/provider-neutral product runtime, rollback and verification gates.','Do not spend the attempt merely explaining a solution. Actually edit an allowed file and finish a bounded change.','Do not merge or create a pull request.'].filter(Boolean).join('\n');}
function assertScope(before,obj){const allowed=allowedPaths(obj),after=trackedPaths(),changed=after.filter(p=>!before.has(p));const violations=[...new Set([...changed.filter(p=>!allowed.has(p)),...after.filter(p=>isProtected(p,obj))])];if(violations.length){rollbackAttempt(before);throw new Error(`scope/protection violation: ${violations.join(', ')}`);}}
function verifyDiff(){execFileSync('git',['diff','--check'],{cwd:root,stdio:'inherit'});}
function verifyBuild(){const remaining=remainingMs();if(remaining<35_000)throw new Error('insufficient remaining run budget for build verification');const result=run('npm',['run','build'],{timeout:Math.min(120_000,remaining-5_000)});if(result.error||result.status!==0)throw new Error(`npm run build failed with status ${result.status??'error'}`);}
function classifyFailure(error){const message=String(error?.message||error||'unknown failure').toLowerCase();if(message.includes('dirty-worktree-before-attempt'))return'dirty-worktree';if(message.includes('scope')||message.includes('protected'))return'scope-violation';if(message.includes('no-progress'))return'no-progress';if(message.includes('timeout')||message.includes('etimedout'))return'timeout';if(message.includes('build'))return'build-failure';if(message.includes('diff'))return'diff-failure';if(message.includes('boundary'))return'boundary-failure';return'verification-failure';}
function recordFailure(obj,pass,error){learning.failures=[...(learning.failures||[]),{objective:obj.id,kind:obj.kind||'product',pass,category:classifyFailure(error),message:String(error?.message||error).slice(0,500),at:new Date().toISOString()}].slice(-100);}
function recordSuccess(obj,pass,before){learning.successes=[...(learning.successes||[]),{objective:obj.id,kind:obj.kind||'product',pass,changedPaths:trackedPaths().filter(p=>!before.has(p)),at:new Date().toISOString()}].slice(-100);}
function persist(){fs.mkdirSync(path.dirname(statePath),{recursive:true});state.protocol=protocol;state.updatedAt=new Date().toISOString();fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');fs.writeFileSync(learningPath,JSON.stringify({...learning,schemaVersion:1},null,2)+'\n');}
const obj=objective();
if(!obj){state.lastStatus='no-eligible-objective';state.updatedAt=new Date().toISOString();fs.mkdirSync(path.dirname(statePath),{recursive:true});fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({ok:true,protocol,status:'no-eligible-objective',completed:state.completed||[]}));process.exit(0);}
try{validateObjective(obj);}catch(error){recordFailure(obj,0,error);persist();console.error(`[aider] invalid objective contract: ${error.message}`);process.exit(1);}
const files=scopedFiles(obj),newFiles=allowNewFiles(obj),isSelfImprovement=obj.kind==='self-improvement';
if(!files.length){console.error(`[aider] objective ${obj.id} has no existing editable files`);process.exit(1);}
const scopePrefix=isSelfImprovement&&files.every(file=>file.startsWith('builder/runner/'))?'builder/runner/':files.every(file=>file.startsWith('src/'))?'src/':'';
const aiderCwd=scopePrefix?path.join(root,scopePrefix):root;
const aiderFiles=scopePrefix?files.filter(file=>file.startsWith(scopePrefix)).map(file=>file.slice(scopePrefix.length)):files;
let success=false;
for(let pass=1;pass<=maxPasses;pass++){
  const remaining=remainingMs();
  if(remaining<Math.max(35_000,reserveMs))break;
  const baseline=trackedPaths();
  if(baseline.length){const error=new Error(`dirty-worktree-before-attempt: ${baseline.join(', ')}`);recordFailure(obj,pass,error);persist();break;}
  state.runs=(state.runs||0)+1;learning.runs=(learning.runs||0)+1;
  const before=new Set(baseline);
  const attemptMs=Math.min(configuredCallMax,Math.max(60_000,remaining-reserveMs));
  const apiTimeout=Math.max(30,Math.floor(attemptMs/1000));
  const args=[`--model=${model}`,`--timeout=${apiTimeout}`,'--yes-always','--no-auto-commits','--no-dirty-commits','--no-gitignore','--no-show-model-warnings','--map-tokens=512','--subtree-only','--message',promptFor(obj,pass,attemptMs),...aiderFiles];
  const result=spawnSync('aider',args,{cwd:aiderCwd,encoding:'utf8',stdio:'inherit',timeout:attemptMs+5_000});
  if(result.error){const error=new Error(result.error.code||result.error.message);rollbackAttempt(before);recordFailure(obj,pass,error);state.failed=[...(state.failed||[]),{id:obj.id,pass,code:result.error.code||'process-error'}];persist();continue;}
  if(result.status!==0){const error=new Error(`Aider exited with status ${result.status}`);rollbackAttempt(before);recordFailure(obj,pass,error);state.failed=[...(state.failed||[]),{id:obj.id,pass,code:result.status}];persist();continue;}
  try{
    assertScope(before,obj);
    const changed=trackedPaths().filter(p=>!before.has(p));
    if(!changed.length)throw new Error('no-progress: Aider completed without changing an allowed file');
    verifyDiff();
    if(obj.kind==='self-improvement')execFileSync('npm',['run','verify:autobot-self-improvement-boundary'],{cwd:root,stdio:'inherit'});
    verifyBuild();
    recordSuccess(obj,pass,before);success=true;break;
  }catch(error){
    console.error(`[aider] pass ${pass} verification failed: ${error.message}`);
    rollbackAttempt(before);
    recordFailure(obj,pass,error);
    state.failed=[...(state.failed||[]),{id:obj.id,pass,code:'verification',error:String(error.message).slice(0,500)}];
    persist();
    if(remainingMs()<Math.max(35_000,reserveMs))break;
  }
}
if(success){state.completed=[...(state.completed||[]),obj.id];state.lastSuccess={id:obj.id,kind:obj.kind||'product',at:new Date().toISOString()};state.lastStatus='objective-complete';}else state.lastStatus='objective-failed';
persist();
console.log(JSON.stringify({ok:success,protocol,objective:obj.id,kind:obj.kind||'product',passes:maxPasses,model,scopePrefix,elapsedMs:(requestedMinutes*60_000)-remainingMs(),remainingMs:remainingMs(),learningFailures:(learning.failures||[]).length,learningSuccesses:(learning.successes||[]).length}));
process.exit(success?0:1);
