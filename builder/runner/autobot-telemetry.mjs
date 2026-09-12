#!/usr/bin/env node
/** Structured live telemetry for AutoBot runs. No secrets or source contents are emitted. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const logPath=path.join(root,'builder','working','autobot-live-telemetry.log');
const runId=process.env.GITHUB_RUN_ID||process.env.BUILDER_BATCH_ID||'local';

function clean(value){
  if(value===undefined||value===null)return null;
  if(typeof value==='string')return value.length>240?`${value.slice(0,237)}...`:value;
  if(Array.isArray(value))return value.slice(0,30).map(clean);
  if(typeof value==='object'){
    const output={};
    for(const [key,item] of Object.entries(value).slice(0,40))output[key]=clean(item);
    return output;
  }
  return value;
}

export function emit(event,payload={}){
  const record={schema:'autobot-live-telemetry-v1',timestamp:new Date().toISOString(),runId,event,...clean(payload)};
  fs.mkdirSync(path.dirname(logPath),{recursive:true});
  fs.appendFileSync(logPath,JSON.stringify(record)+'\n');
  console.log(`AUTOBOT_EVENT ${JSON.stringify(record)}`);
  return record;
}

export function heartbeat(payload={}){return emit('heartbeat',payload);}
export function telemetryPath(){return logPath;}
