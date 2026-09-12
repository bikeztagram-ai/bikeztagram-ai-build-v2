#!/usr/bin/env node
/** Run the sustained AutoBot with live, structured heartbeat telemetry. */
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { emit, heartbeat } from './autobot-telemetry.mjs';

const root=process.cwd();
const statePath=`${root}/builder/working/long-run-state.json`;
const checkpointPath=`${root}/builder/working/deterministic-autobot.json`;
const aiderStatePath=`${root}/builder/working/aider-feature-brain-state.json`;

function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function snapshot(){
  const state=readJson(statePath)||{};
  const checkpoint=readJson(checkpointPath)||{};
  const aider=readJson(aiderStatePath)||{};
  return {status:state.status||checkpoint.status||'starting',objectiveId:checkpoint.objectiveId||aider.inProgress?.id||null,taskId:checkpoint.taskId||checkpoint.blockedTask||null,iteration:state.iterations??null,featureCycles:state.featureCycles??null,featureEngine:state.featureEngine||null,featureProtocol:state.featureProtocol||null,elapsedMinutes:state.elapsedMinutes??null,remainingMinutes:state.remainingMinutes??null,verifiedUnits:state.totalUnits??null,consecutiveNoProgress:state.consecutiveNoProgress??null,lastSuccess:aider.lastSuccess?.id||null};
}

const child=spawn(process.execPath,['builder/runner/long-run-executor.mjs'],{cwd:root,env:process.env,stdio:'inherit'});
emit('run-wrapper-started',{controller:'run-with-live-telemetry',intervalSeconds:60,requestedMinutes:process.env.BUILDER_MAX_MINUTES||null,model:process.env.LOCAL_AI_MODEL||null});
const tick=()=>heartbeat(snapshot());
const interval=setInterval(tick,60_000);
tick();

function stop(signal){clearInterval(interval);emit('run-wrapper-signal',{signal});child.kill(signal);}
process.on('SIGTERM',()=>stop('SIGTERM'));
process.on('SIGINT',()=>stop('SIGINT'));
child.on('error',error=>{clearInterval(interval);emit('run-wrapper-error',{message:error.message});process.exitCode=1;});
child.on('exit',(code,signal)=>{clearInterval(interval);emit('run-wrapper-finished',{code,signal,...snapshot()});process.exitCode=code??1;});
