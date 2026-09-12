#!/usr/bin/env node
/**
 * Durable handoff primitive for the future AutoBot fleet.
 * This module records failures as evidence; it does not repair code and does
 * not modify the proven Builder workflow.
 *
 * Queue state is append-only: transitions are new records, so a repair worker
 * can claim/complete work without rewriting historical evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const queuePath=process.env.AUTOBOT_FAILURE_QUEUE_PATH||path.join(root,'builder','working','autobot-failure-queue.jsonl');
const SCHEMA_VERSION=1;
const STATUSES=new Set(['open','claimed','repairing','repaired','verified','rejected','blocked']);

function ensureParent(){fs.mkdirSync(path.dirname(queuePath),{recursive:true});}
function normalise(value){return value===undefined?null:value;}
function idFor(input){return crypto.createHash('sha256').update(JSON.stringify({schemaVersion:SCHEMA_VERSION,source:input.source||'unknown',runId:normalise(input.runId),objectiveId:normalise(input.objectiveId),taskId:normalise(input.taskId),error:normalise(input.error),createdAt:normalise(input.createdAt)})).digest('hex').slice(0,24);}
function appendRecord(record){ensureParent();fs.appendFileSync(queuePath,JSON.stringify(record)+'\n',{encoding:'utf8',flag:'a'});return record;}

export function appendFailure(input={}){
  const createdAt=input.createdAt||new Date().toISOString();
  return appendRecord({
    schemaVersion:SCHEMA_VERSION,
    id:idFor({...input,createdAt}),
    status:'open',
    createdAt,
    source:input.source||'unknown',
    runId:normalise(input.runId),
    objectiveId:normalise(input.objectiveId),
    taskId:normalise(input.taskId),
    stage:input.stage||'unknown',
    error:input.error||'unspecified failure',
    expected:normalise(input.expected),
    actual:normalise(input.actual),
    files:Array.isArray(input.files)?input.files.filter(Boolean):[],
    attempted:Array.isArray(input.attempted)?input.attempted.filter(Boolean):[],
    evidence:Array.isArray(input.evidence)?input.evidence.filter(Boolean):[],
    retryable:Boolean(input.retryable),
    repairHint:normalise(input.repairHint)
  });
}

function rawRecords(){
  try{fs.accessSync(queuePath);}catch{return[];}
  return fs.readFileSync(queuePath,'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
}

export function readFailures({status=null}={}){
  const latest=new Map();
  for(const record of rawRecords())latest.set(record.id,record);
  const records=[...latest.values()];
  return status?records.filter(record=>record.status===status):records;
}

export function transitionFailure(id,status,input={}){
  if(!id)throw new Error('failure transition requires an id');
  if(!STATUSES.has(status))throw new Error(`unsupported failure status: ${status}`);
  const current=readFailures().find(record=>record.id===id);
  if(!current)throw new Error(`failure not found: ${id}`);
  return appendRecord({...current,status,updatedAt:new Date().toISOString(),transitionedBy:input.transitionedBy||'unknown',handoffTo:normalise(input.handoffTo),repairBranch:normalise(input.repairBranch),repairCommit:normalise(input.repairCommit),resolution:normalise(input.resolution)});
}

export function queueSummary(){
  const records=readFailures();
  const byStatus={};
  for(const record of records)byStatus[record.status]=(byStatus[record.status]||0)+1;
  return {schemaVersion:SCHEMA_VERSION,path:path.relative(root,queuePath),records:records.length,byStatus,open:records.filter(r=>r.status==='open')};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const command=process.argv[2]||'summary';
  if(command==='summary')console.log(JSON.stringify(queueSummary(),null,2));
  else if(command==='append'){
    const raw=process.argv[3];
    if(!raw)throw new Error('append requires a JSON failure record');
    console.log(JSON.stringify(appendFailure(JSON.parse(raw)),null,2));
  }else if(command==='transition'){
    const id=process.argv[3];
    const status=process.argv[4];
    const raw=process.argv[5];
    if(!id||!status)throw new Error('transition requires failure id and status');
    console.log(JSON.stringify(transitionFailure(id,status,raw?JSON.parse(raw):{}),null,2));
  }else throw new Error(`unknown command: ${command}`);
}
