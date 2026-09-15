#!/usr/bin/env node
import fs from 'node:fs';

const workerId=process.env.AUTOBOT_PROVEN_WORKER_ID||'unknown';
const runOutcome=process.env.AUTOBOT_PROVEN_RUN_OUTCOME||'failure';
const checkpointFile='builder/working/deterministic-autobot.json';
const patchFile='builder/working/autobot-proven-worker.patch';
let checkpoint=null;
try{checkpoint=JSON.parse(fs.readFileSync(checkpointFile,'utf8'));}catch{}
const patchExists=fs.existsSync(patchFile)&&fs.statSync(patchFile).size>0;
const status=runOutcome==='success'?'success':'failure';
const error=checkpoint?.error||null;
const files=Array.isArray(checkpoint?.files)?checkpoint.files.map(x=>typeof x==='string'?x:x?.path).filter(Boolean):[];
const candidatePatch=patchExists?'builder/working/autobot-proven-worker.patch':null;
const outcome={schemaVersion:'autobot-proven-worker-outcome-v1',workerId,status,repairable:status==='failure'&&patchExists,category:status==='failure'?(patchExists?'product-change':'infrastructure-or-no-candidate'):'completed',objectiveId:checkpoint?.objectiveId||null,error,baseCommit:fs.existsSync('builder/working/autobot-proven-worker-base-sha.txt')?fs.readFileSync('builder/working/autobot-proven-worker-base-sha.txt','utf8').trim():null,patchPath:candidatePatch,candidatePatch,files,evidence:['builder/working/deterministic-autobot.json','builder/working/deterministic-autobot-evidence.json','builder/working/long-run-state.json']};
fs.writeFileSync('builder/working/autobot-proven-worker-outcome.json',JSON.stringify(outcome,null,2)+'\n');
console.log(JSON.stringify(outcome,null,2));
