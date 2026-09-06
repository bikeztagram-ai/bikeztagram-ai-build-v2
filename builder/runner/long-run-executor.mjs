#!/usr/bin/env node
/**
 * Sustained AutoBot controller.
 * Alternates deterministic backlog work and bounded local feature-engineering
 * slices until the shared time/unit budget is exhausted. This keeps the agent
 * productive across an entire run instead of handing the remaining budget to
 * the feature brain once and then stopping.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { appendAudit, verifyAuditLog } from '../quality/audit-log.mjs';

const root = process.cwd();
const checkpoint = path.join(root, 'builder', 'working', 'deterministic-autobot.json');
const requestedMinutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '360', 10);
const requestedUnits = Number.parseInt(process.env.BUILDER_MAX_UNITS || '1000', 10);
const started = Date.now();
let totalUnits = 0;
let totalObjectives = 0;
let iteration = 0;
let replenishments = 0;
let featureCycles = 0;
const maxReplenishments = Number.parseInt(process.env.AUTOBOT_MAX_GENERATED_WAVES || '3', 10);
const featureSliceMinutes = Math.max(3, Number.parseInt(process.env.AUTOBOT_FEATURE_SLICE_MINUTES || '15', 10));
const maxFeatureCycles = Math.max(1, Number.parseInt(process.env.AUTOBOT_MAX_FEATURE_CYCLES || '24', 10));
const featurePassesPerSlice = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES_PER_SLICE || '3', 10));
const completedObjectives = new Set();

function readState() { try { return JSON.parse(fs.readFileSync(checkpoint, 'utf8')); } catch { return null; } }
function seedFromCheckpoint() { const state=readState(); if(!state)return; if(Array.isArray(state.history?.objectives))for(const id of state.history.objectives)completedObjectives.add(id); if(state.objectiveId&&state.status==='objective-complete')completedObjectives.add(state.objectiveId); }
function remainingMinutes(){return Math.max(0,requestedMinutes-(Date.now()-started)/60000);}
function assertAuditIntegrity(stage){const result=verifyAuditLog(); if(!result.valid){console.error(`[autobot] audit integrity failure before ${stage}: ${result.error}`);process.exit(3);} return result;}
function runOnce(minutes,units){const env={...process.env,BUILDER_MAX_MINUTES:String(Math.max(1,Math.ceil(minutes))),BUILDER_MAX_UNITS:String(Math.max(1,units)),BUILDER_COMPLETED_OBJECTIVES:[...completedObjectives].join(',')};const result=spawnSync(process.execPath,['builder/runner/deterministic-executor.mjs'],{cwd:root,stdio:'inherit',env});return result.error?1:(result.status??1);}
function replenishBacklog(){if(replenishments>=maxReplenishments)return false;const result=spawnSync(process.execPath,['scripts/autobot/replenish-production-backlog.mjs'],{cwd:root,stdio:'inherit',env:{...process.env,AUTOBOT_MAX_GENERATED_WAVES:String(maxReplenishments)}});if(result.error||result.status!==0)return false;replenishments++;appendAudit('backlog-replenished',{wave:replenishments,maxWaves:maxReplenishments});return true;}
function runFeatureBrain(){if(remainingMinutes()<=1||featureCycles>=maxFeatureCycles)return 0;featureCycles++;const slice=Math.min(featureSliceMinutes,Math.max(1,Math.floor(remainingMinutes())));const env={...process.env,BUILDER_MAX_MINUTES:String(slice),LOCAL_AI_MODEL:process.env.LOCAL_AI_MODEL||'qwen2.5-coder:3b',AUTOBOT_FEATURE_PASSES:String(featurePassesPerSlice)};appendAudit('feature-brain-started',{cycle:featureCycles,minutes:slice,model:env.LOCAL_AI_MODEL,passes:featurePassesPerSlice});console.log(`[autobot] feature-engineering cycle ${featureCycles}/${maxFeatureCycles}: ${slice}m slice; model=${env.LOCAL_AI_MODEL}`);const result=spawnSync(process.execPath,['builder/runner/feature-brain.mjs'],{cwd:root,stdio:'inherit',env});const status=result.error?1:(result.status??1);appendAudit('feature-brain-finished',{cycle:featureCycles,status,remainingMinutes:Number(remainingMinutes().toFixed(2))});return status;}

seedFromCheckpoint();
assertAuditIntegrity('run-start');
appendAudit('run-started',{requestedMinutes,requestedUnits,completedObjectives:[...completedObjectives].sort(),maxReplenishments,featureSliceMinutes,maxFeatureCycles,featurePassesPerSlice});

while(totalUnits<requestedUnits&&remainingMinutes()>0){
  iteration++;
  appendAudit('iteration-started',{iteration,remainingMinutes:Math.floor(remainingMinutes()),remainingUnits:requestedUnits-totalUnits,featureCycles});
  const status=runOnce(remainingMinutes(),requestedUnits-totalUnits);
  const state=readState();
  if(status!==0){appendAudit('run-blocked',{iteration,status,objectiveId:state?.objectiveId||null,taskId:state?.blockedTask||null,error:state?.error||null});process.exit(status);}
  const verifiedThisRun=Array.isArray(state?.verifiedThisRun)?state.verifiedThisRun:[];
  totalUnits+=verifiedThisRun.length;
  if(state?.history?.objectives)for(const id of state.history.objectives)completedObjectives.add(id);
  totalObjectives=completedObjectives.size;
  appendAudit('iteration-finished',{iteration,status:state?.status||'unknown',verifiedUnits:verifiedThisRun.length,objectiveId:state?.objectiveId||null,objectiveStatus:state?.status||null});
  if(state?.status==='blocked'){appendAudit('run-blocked',{iteration,objectiveId:state.objectiveId||null,taskId:state.blockedTask||null,error:state.error||null});process.exit(2);}
  if(remainingMinutes()<=1)break;

  if(state?.status==='idle'&&totalUnits<requestedUnits){
    if(replenishBacklog()) continue;
    appendAudit('deterministic-idle',{iteration,featureCycles});
  }

  if(featureCycles<maxFeatureCycles&&remainingMinutes()>1){
    const featureStatus=runFeatureBrain();
    if(featureStatus!==0){appendAudit('run-blocked',{iteration,status:featureStatus,phase:'feature-brain'});process.exit(featureStatus);}
  }

  if(verifiedThisRun.length===0&&state?.status!=='idle'&&featureCycles>=maxFeatureCycles)break;
  if(state?.status==='checkpointed'||state?.status==='objective-complete'||state?.status==='idle')continue;
  break;
}

const summary={totalUnits,totalObjectives,iterations:iteration,elapsedMinutes:Number(((Date.now()-started)/60000).toFixed(2)),replenishments,featureBrain:featureCycles>0,featureCycles,remainingMinutes:Number(remainingMinutes().toFixed(2))};
appendAudit('run-finished',summary);
const audit=verifyAuditLog();
if(!audit.valid){console.error(`[autobot] final audit verification failed: ${audit.error}`);process.exit(3);}
console.log(`[autobot] sustained run finished: ${totalUnits}/${requestedUnits} newly verified deterministic units; ${totalObjectives} completed objectives; ${iteration} iterations; ${summary.elapsedMinutes} minutes elapsed; replenishments=${replenishments}; featureCycles=${featureCycles}; auditRecords=${audit.checked}.`);
