#!/usr/bin/env node
/**
 * Sustained AutoBot controller with resumable work and controlled finish grace.
 *
 * The normal mode remains the production deterministic AutoBot. Specialist mode
 * is not a second engine: it uses this same controller and its existing
 * Aider Feature Brain as the scoped work unit supplied by a specialist
 * assignment. This keeps the long-run/checkpoint/audit/recovery behaviour in
 * one place without cloning the proven AutoBot.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { appendAudit, verifyAuditLog } from '../quality/audit-log.mjs';

const root=process.cwd();
const checkpoint=path.join(root,'builder','working','deterministic-autobot.json');
const runtimeStatePath=path.join(root,'builder','working','long-run-state.json');
const specialistMode=String(process.env.AUTOBOT_SPECIALIST_MODE||'').trim().toLowerCase()==='true';
const requestedMinutes=Number.parseInt(process.env.BUILDER_MAX_MINUTES||'360',10);
const requestedUnits=Number.parseInt(process.env.BUILDER_MAX_UNITS||'1000',10);
const finishGraceMinutes=Math.max(0,Number.parseInt(process.env.AUTOBOT_FINISH_GRACE_MINUTES||'5',10));
const started=Date.now();
const normalRunDeadline=started+requestedMinutes*60_000;
const runDeadline=normalRunDeadline+finishGraceMinutes*60_000;
let totalUnits=0,totalObjectives=0,iteration=0,replenishments=0,featureCycles=0,consecutiveNoProgress=0;
let specialistFailureStatus=0;
const maxNoProgressIterations=Math.max(1,Number.parseInt(process.env.AUTOBOT_MAX_NO_PROGRESS_ITERATIONS||'2',10));
const maxReplenishments=Number.parseInt(process.env.AUTOBOT_MAX_GENERATED_WAVES||'3',10);
const deterministicSliceMinutes=Math.max(3,Number.parseInt(process.env.AUTOBOT_DETERMINISTIC_SLICE_MINUTES||'5',10));
const featureSliceMinutes=Math.max(3,Number.parseInt(process.env.AUTOBOT_FEATURE_SLICE_MINUTES||'20',10));
const maxFeatureCycles=Math.max(1,Number.parseInt(process.env.AUTOBOT_MAX_FEATURE_CYCLES||'24',10));
const configuredFeaturePasses=process.env.AUTOBOT_FEATURE_PASSES||process.env.AUTOBOT_FEATURE_PASSES_PER_SLICE||'2';
const featurePassesPerSlice=Math.max(1,Math.min(3,Number.parseInt(configuredFeaturePasses,10)||2));
const featureProtocol=process.env.AUTOBOT_FEATURE_ENGINE==='aider'?(process.env.AUTOBOT_FEATURE_PROTOCOL||'aider-repo-map-v4'):'structured-search-replace-v3';
const featureEngine=process.env.AUTOBOT_FEATURE_ENGINE==='aider'?'builder/runner/aider-feature-brain.mjs':'builder/runner/feature-brain.mjs';
if(specialistMode&&process.env.AUTOBOT_FEATURE_ENGINE!=='aider')throw new Error('Specialist AutoBot mode is locked to the proven Aider feature engine.');
const completedObjectives=new Set();

function readState(){try{return JSON.parse(fs.readFileSync(checkpoint,'utf8'));}catch{return null;}}
function seedFromCheckpoint(){const state=readState();if(!state)return;if(Array.isArray(state.history?.objectives))for(const id of state.history.objectives)completedObjectives.add(id);if(state.objectiveId&&state.status==='objective-complete')completedObjectives.add(state.objectiveId);}
function remainingMs(){return Math.max(0,runDeadline-Date.now());}
function normalRemainingMs(){return Math.max(0,normalRunDeadline-Date.now());}
function inFinishGrace(){return normalRemainingMs()<=0&&remainingMs()>0;}
function writeRuntimeState(status='running'){
  const state={schemaVersion:3,status,mode:specialistMode?'specialist':'standard',requestedMinutes,finishGraceMinutes,requestedUnits,totalUnits,totalObjectives,iterations:iteration,replenishments,featureCycles,featurePassesPerSlice,consecutiveNoProgress,featureEngine,featureProtocol,startedAt:new Date(started).toISOString(),normalDeadline:new Date(normalRunDeadline).toISOString(),hardDeadline:new Date(runDeadline).toISOString(),updatedAt:new Date().toISOString(),elapsedMinutes:Number(((Date.now()-started)/60000).toFixed(2)),remainingMinutes:Number((remainingMs()/60000).toFixed(2)),normalRemainingMinutes:Number((normalRemainingMs()/60000).toFixed(2)),finishGraceActive:inFinishGrace()};
  fs.mkdirSync(path.dirname(runtimeStatePath),{recursive:true});
  fs.writeFileSync(runtimeStatePath,JSON.stringify(state,null,2)+'\n');
  return state;
}
function assertAuditIntegrity(stage){const result=verifyAuditLog();if(!result.valid){console.error(`[autobot] audit integrity failure before ${stage}: ${result.error}`);process.exit(3);}return result;}
function childTimeoutMs(){return Math.max(1_000,remainingMs());}
function runOnce(minutes,units){
  const selfImprovementOnly=iteration%2===0;
  const env={...process.env,BUILDER_MAX_MINUTES:String(Math.max(1,Math.ceil(minutes))),BUILDER_MAX_UNITS:String(Math.max(1,units)),BUILDER_COMPLETED_OBJECTIVES:[...completedObjectives].join(','),AUTOBOT_RUN_DEADLINE_EPOCH_MS:String(runDeadline),AUTOBOT_NORMAL_DEADLINE_EPOCH_MS:String(normalRunDeadline),AUTOBOT_SELF_IMPROVEMENT_ONLY:String(selfImprovementOnly)};
  const result=spawnSync(process.execPath,['builder/runner/deterministic-executor.mjs'],{cwd:root,stdio:'inherit',env,timeout:childTimeoutMs()});
  return result.error?1:(result.status??1);
}
function replenishBacklog(){
  if(replenishments>=maxReplenishments||inFinishGrace())return false;
  const result=spawnSync(process.execPath,['scripts/autobot/replenish-production-backlog.mjs'],{cwd:root,stdio:'inherit',env:{...process.env,AUTOBOT_MAX_GENERATED_WAVES:String(maxReplenishments),AUTOBOT_RUN_DEADLINE_EPOCH_MS:String(runDeadline),AUTOBOT_NORMAL_DEADLINE_EPOCH_MS:String(normalRunDeadline)},timeout:childTimeoutMs()});
  if(result.error||result.status!==0)return false;
  replenishments++;
  appendAudit('backlog-replenished',{wave:replenishments,maxWaves:maxReplenishments});
  writeRuntimeState();
  return true;
}
function runFeatureBrain(){
  if(remainingMs()<=60_000||featureCycles>=maxFeatureCycles||inFinishGrace())return 0;
  featureCycles++;
  const slice=Math.min(featureSliceMinutes,Math.max(1,Math.floor(remainingMs()/60000)));
  const assignmentPath=String(process.env.AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH||'').trim();
  if(specialistMode&&!assignmentPath)throw new Error('Specialist AutoBot mode requires AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH.');
  if(specialistMode&&!fs.existsSync(assignmentPath))throw new Error(`Specialist AutoBot assignment not found: ${assignmentPath}`);
  const featureDeadline=process.env.AUTOBOT_FEATURE_DEADLINE_EPOCH_MS||String(runDeadline);
  const featureNormalDeadline=process.env.AUTOBOT_FEATURE_NORMAL_DEADLINE_EPOCH_MS||String(normalRunDeadline);
  const env={...process.env,BUILDER_MAX_MINUTES:String(slice),LOCAL_AI_MODEL:process.env.LOCAL_AI_MODEL||'qwen2.5-coder:7b',AUTOBOT_FEATURE_PASSES:String(featurePassesPerSlice),AUTOBOT_FEATURE_PROTOCOL:featureProtocol,AUTOBOT_FEATURE_DEADLINE_EPOCH_MS:featureDeadline,AUTOBOT_FEATURE_NORMAL_DEADLINE_EPOCH_MS:featureNormalDeadline,AUTOBOT_AIDER_MODEL:process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL||'ollama_chat/qwen2.5-coder:7b'};
  if(specialistMode){env.AUTOBOT_ORCHESTRATOR_ENABLED='true';env.AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH=assignmentPath;}
  appendAudit('feature-brain-started',{cycle:featureCycles,mode:specialistMode?'specialist':'standard',minutes:slice,model:env.AUTOBOT_AIDER_MODEL,engine:featureEngine,passes:featurePassesPerSlice,protocol:featureProtocol,assignmentPath:specialistMode?assignmentPath:null,deadline:new Date(Number(featureDeadline)).toISOString(),normalDeadline:new Date(Number(featureNormalDeadline)).toISOString()});
  console.log(`[autobot] ${specialistMode?'specialist ':''}feature-engineering cycle ${featureCycles}/${maxFeatureCycles}: ${slice}m slice; engine=${featureEngine}; model=${env.AUTOBOT_AIDER_MODEL}; passes=${featurePassesPerSlice}; protocol=${featureProtocol}`);
  const result=spawnSync(process.execPath,[featureEngine],{cwd:root,stdio:'inherit',env,timeout:childTimeoutMs()});
  const status=result.error?1:(result.status??1);
  appendAudit('feature-brain-finished',{cycle:featureCycles,mode:specialistMode?'specialist':'standard',status,remainingMinutes:Number((remainingMs()/60000).toFixed(2)),engine:featureEngine,protocol:featureProtocol,finishGraceActive:inFinishGrace()});
  writeRuntimeState(status===0?'running':'blocked');
  return status;
}

seedFromCheckpoint();
assertAuditIntegrity('run-start');
writeRuntimeState('running');
appendAudit('run-started',{mode:specialistMode?'specialist':'standard',requestedMinutes,finishGraceMinutes,requestedUnits,completedObjectives:[...completedObjectives].sort(),maxReplenishments,deterministicSliceMinutes,featureSliceMinutes,maxFeatureCycles,featurePassesPerSlice,maxNoProgressIterations,featureProtocol,featureEngine,normalDeadline:new Date(normalRunDeadline).toISOString(),hardDeadline:new Date(runDeadline).toISOString(),assignmentPath:specialistMode?(process.env.AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH||null):null});

if(specialistMode){
  // Specialist work must never enter the global deterministic roadmap. The
  // proven controller still owns the clock, resumable runtime state, audit
  // trail, bounded cycles, multi-pass feature engine and recoverable failures.
  while(remainingMs()>0&&normalRemainingMs()>0&&featureCycles<maxFeatureCycles){
    iteration++;
    const slice=Math.min(featureSliceMinutes,Math.max(1,Math.floor(remainingMs()/60000)));
    appendAudit('iteration-started',{iteration,mode:'specialist',remainingMinutes:Math.floor(remainingMs()/60000),normalRemainingMinutes:Math.floor(normalRemainingMs()/60000),featureCycles,featureSlice:slice});
    const status=runFeatureBrain();
    if(status!==0){
      specialistFailureStatus=status;
      consecutiveNoProgress++;
      appendAudit('feature-brain-recoverable-failure',{iteration,mode:'specialist',status,consecutiveNoProgress,remainingMinutes:Number((remainingMs()/60000).toFixed(2)),engine:featureEngine,repairCandidatePreserved:process.env.AUTOBOT_SPECIALIST_MODE==='true'});
      writeRuntimeState('blocked');
      break;
    }else{
      consecutiveNoProgress=0;
      appendAudit('iteration-finished',{iteration,mode:'specialist',status,featureCycles,consecutiveNoProgress});
      writeRuntimeState('running');
    }
    if(remainingMs()<=60_000||normalRemainingMs()<=0)break;
  }
}else{
  while(totalUnits<requestedUnits&&remainingMs()>0){
    iteration++;
    const deterministicSlice=Math.min(deterministicSliceMinutes,Math.max(1,Math.floor(remainingMs()/60000));
    appendAudit('iteration-started',{iteration,remainingMinutes:Math.floor(remainingMs()/60000),normalRemainingMinutes:Math.floor(normalRemainingMs()/60000),remainingUnits:requestedUnits-totalUnits,featureCycles,deterministicSlice,consecutiveNoProgress,selfImprovementSlice:iteration%2===0});
    const status=runOnce(deterministicSlice,requestedUnits-totalUnits);
    const state=readState();
    if(status!==0){
      if(remainingMs()<=0){appendAudit('time-budget-exhausted',{iteration,stage:'deterministic',requestedMinutes,finishGraceMinutes});break;}
      appendAudit('run-blocked',{iteration,status,objectiveId:state?.objectiveId||null,taskId:state?.blockedTask||null,error:state?.error||null});
      writeRuntimeState('blocked');
      process.exit(status);
    }
    const verifiedThisRun=Array.isArray(state?.verifiedThisRun)?state.verifiedThisRun:[];
    totalUnits+=verifiedThisRun.length;
    if(state?.history?.objectives)for(const id of state.history.objectives)completedObjectives.add(id);
    totalObjectives=completedObjectives.size;
    if(verifiedThisRun.length===0){consecutiveNoProgress++;appendAudit('no-progress-detected',{iteration,consecutiveNoProgress,maxNoProgressIterations,objectiveId:state?.objectiveId||null,taskId:state?.blockedTask||null,status:state?.status||null});}else consecutiveNoProgress=0;
    appendAudit('iteration-finished',{iteration,status:state?.status||'unknown',verifiedUnits:verifiedThisRun.length,objectiveId:state?.objectiveId||null,objectiveStatus:state?.status||null,consecutiveNoProgress});
    writeRuntimeState('running');
    if(state?.status==='blocked'){appendAudit('run-blocked',{iteration,objectiveId:state.objectiveId||null,taskId:state.blockedTask||null,error:state.error||null});writeRuntimeState('blocked');process.exit(2);}
    if(remainingMs()<=60_000||normalRemainingMs()<=0)break;
    if(state?.status==='idle'&&totalUnits<requestedUnits&&replenishBacklog())continue;
    if(consecutiveNoProgress>=maxNoProgressIterations){appendAudit('no-progress-stop',{iteration,consecutiveNoProgress,maxNoProgressIterations,totalUnits,totalObjectives});break;}
    const featureStatus=runFeatureBrain();
    if(featureStatus!==0){appendAudit('feature-brain-recoverable-failure',{iteration,status:featureStatus,remainingMinutes:Number((remainingMs()/60000).toFixed(2)),engine:featureEngine});writeRuntimeState('running');}
    if(remainingMs()<=60_000||normalRemainingMs()<=0)break;
    if(state?.status==='idle'&&featureCycles>=maxFeatureCycles)break;
  }
}

const summary={mode:specialistMode?'specialist':'standard',totalUnits,totalObjectives,iterations:iteration,elapsedMinutes:Number(((Date.now()-started)/60000).toFixed(2)),replenishments,featureBrain:featureCycles>0,featureCycles,featurePassesPerSlice,consecutiveNoProgress,remainingMinutes:Number((remainingMs()/60000).toFixed(2)),normalRemainingMinutes:Number((normalRemainingMs()/60000).toFixed(2)),finishGraceMinutes,featureProtocol,featureEngine,selfImprovementSlices:specialistMode?0:Math.floor(iteration/2),assignmentPath:specialistMode?(process.env.AUTOBOT_ORCHESTRATOR_ASSIGNMENT_PATH||null):null,specialistFailureStatus};
appendAudit('run-finished',summary);
writeRuntimeState(specialistFailureStatus!==0?'blocked':'finished');
const audit=verifyAuditLog();
if(!audit.valid){console.error(`[autobot] final audit verification failed: ${audit.error}`);process.exit(3);}
console.log(`[autobot] sustained ${specialistMode?'specialist ':''}run finished: ${totalUnits}/${requestedUnits} newly verified deterministic units; ${totalObjectives} completed objectives; ${iteration} iterations; ${summary.elapsedMinutes} minutes elapsed; featureCycles=${featureCycles}; engine=${featureEngine}; finishGrace=${finishGraceMinutes}m; auditRecords=${audit.checked}.`);
if(specialistFailureStatus!==0)process.exit(specialistFailureStatus);
