#!/usr/bin/env node
/** Run deterministic work first, then hand the remaining budget to the feature-level local engineer. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checkpoint = path.join(root, 'builder', 'working', 'deterministic-autobot.json');
const requestedMinutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '360', 10);
const requestedUnits = Number.parseInt(process.env.BUILDER_MAX_UNITS || '1000', 10);
const started = Date.now();
let totalUnits = 0;
let iteration = 0;
let replenishments = 0;
const maxReplenishments = Number.parseInt(process.env.AUTOBOT_MAX_GENERATED_WAVES || '3', 10);
const completedObjectives = new Set();
let localBrainStarted = false;

function readState() { try { return JSON.parse(fs.readFileSync(checkpoint, 'utf8')); } catch { return null; } }
function seedFromCheckpoint() { const state=readState(); if(!state)return; if(state.history?.objectives)for(const id of state.history.objectives)completedObjectives.add(id); if(state.objectiveId&&state.status==='objective-complete')completedObjectives.add(state.objectiveId); }
function remainingMinutes(){return Math.max(0,requestedMinutes-(Date.now()-started)/60000);}
function runOnce(minutes,units){const env={...process.env,BUILDER_MAX_MINUTES:String(Math.max(1,Math.ceil(minutes))),BUILDER_MAX_UNITS:String(Math.max(1,units)),BUILDER_COMPLETED_OBJECTIVES:[...completedObjectives].join(',')}; const r=spawnSync(process.execPath,['builder/runner/deterministic-executor.mjs'],{cwd:root,stdio:'inherit',env}); return r.error?1:(r.status??1);}
function replenishBacklog(){if(replenishments>=maxReplenishments)return false;const r=spawnSync(process.execPath,['scripts/autobot/replenish-production-backlog.mjs'],{cwd:root,stdio:'inherit',env:{...process.env,AUTOBOT_MAX_GENERATED_WAVES:String(maxReplenishments)}});if(r.error||r.status!==0)return false;replenishments++;return true;}
function runFeatureBrain(){if(localBrainStarted||remainingMinutes()<=1)return 0;localBrainStarted=true;const minutes=Math.max(1,Math.floor(remainingMinutes()));const env={...process.env,BUILDER_MAX_MINUTES:String(minutes),LOCAL_AI_MODEL:process.env.LOCAL_AI_MODEL||'qwen2.5-coder:3b',AUTOBOT_FEATURE_PASSES:process.env.AUTOBOT_FEATURE_PASSES||'12'};console.log(`[autobot] handing ${minutes} minutes to feature-level local engineer; model=${env.LOCAL_AI_MODEL}`);const r=spawnSync(process.execPath,['builder/runner/feature-brain.mjs'],{cwd:root,stdio:'inherit',env});if(r.error)return 1;return r.status??1;}

seedFromCheckpoint();
while(totalUnits<requestedUnits&&remainingMinutes()>0){
 iteration++;
 const status=runOnce(remainingMinutes(),requestedUnits-totalUnits);
 const state=readState();
 if(status!==0)process.exit(status);
 const verified=Array.isArray(state?.verifiedThisRun)?state.verifiedThisRun:[];
 totalUnits+=verified.length;
 if(state?.history?.objectives)for(const id of state.history.objectives)completedObjectives.add(id);
 if(state?.status==='blocked')process.exit(2);
 if(state?.status==='idle'||state?.status==='objective-complete'){
   if(remainingMinutes()<=1)break;
   if(state?.status==='idle'&&totalUnits<requestedUnits&&replenishBacklog())continue;
   const featureStatus=runFeatureBrain();if(featureStatus!==0)process.exit(featureStatus);break;
 }
 if(verified.length===0){const featureStatus=runFeatureBrain();if(featureStatus!==0)process.exit(featureStatus);break;}
 if(state?.status!=='checkpointed')break;
}
console.log(`[autobot] sustained run finished: ${totalUnits}/${requestedUnits} deterministic units; ${((Date.now()-started)/60000).toFixed(2)} minutes elapsed; replenishments=${replenishments}; featureBrain=${localBrainStarted}.`);
