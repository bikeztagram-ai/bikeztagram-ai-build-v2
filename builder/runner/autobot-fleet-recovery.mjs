#!/usr/bin/env node
/**
 * Controlled AutoBot fleet recovery loop.
 *
 * This is the bridge between the proven Builder's failure evidence and the
 * already-verified Repair -> QA -> Reviewer fleet. It never edits the
 * protected Builder checkout, merges, pushes, or weakens gates.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { appendFailure, readFailures } from './autobot-failure-queue.mjs';

const root=process.cwd();
const checkpointPath=path.join(root,'builder','working','deterministic-autobot.json');
const evidencePath=path.join(root,'builder','working','deterministic-autobot-evidence.json');
const fleetStatePath=path.join(root,'builder','working','autobot-fleet-recovery.json');
const registryPath=path.join(root,'builder','brain','autobot-fleet.json');
const validCommit=value=>/^[0-9a-f]{40}$/i.test(String(value||''));
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function git(args){return execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();}
function fail(message){throw new Error(message);}
function findTask(taskId){
  if(!taskId)return null;
  for(const file of ['builder/brain/task-library.json','builder/brain/self-improvement-task-library.json']){
    const full=path.join(root,file);
    if(!fs.existsSync(full))continue;
    const data=readJson(full);
    const task=(data.tasks||[]).find(item=>item.id===taskId);
    if(task)return task;
  }
  return null;
}
function registeredWorker(registry,id){
  const worker=(registry.bots||[]).find(item=>item.id===id);
  if(!worker)fail(`Registered AutoBot worker '${id}' is missing from builder/brain/autobot-fleet.json.`);
  if(worker.status!=='verified')fail(`Registered AutoBot worker '${id}' is not verified.`);
  if(worker.protected===true)fail(`Protected AutoBot worker '${id}' cannot be used by controlled recovery.`);
  if(typeof worker.entrypoint!=='string'||!worker.entrypoint)fail(`Registered AutoBot worker '${id}' has no exact entrypoint.`);
  const full=path.join(root,worker.entrypoint);
  if(!fs.existsSync(full))fail(`Registered AutoBot worker '${id}' entrypoint does not exist: ${worker.entrypoint}`);
  return worker;
}
async function loadWorker(registry,id){
  const worker=registeredWorker(registry,id);
  return {worker,module:await import(pathToFileURL(path.join(root,worker.entrypoint)).href)};
}
function captureFailure(){
  const checkpoint=fs.existsSync(checkpointPath)?readJson(checkpointPath):null;
  const evidence=fs.existsSync(evidencePath)?readJson(evidencePath):null;
  const task=findTask(checkpoint?.blockedTask||checkpoint?.currentTask);
  const status=git(['status','--short','--untracked-files=no']);
  const changed=status.split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);
  const files=[...new Set([...(Array.isArray(task?.files)?task.files:[]),...changed])].filter(file=>file&&!file.startsWith('.github/'));
  if(!checkpoint?.error)fail('Builder failure evidence does not contain a durable error message.');
  if(!files.length)fail('Builder failure evidence does not identify a repairable product-file scope.');
  return appendFailure({
    source:'autobot-fleet-recovery',
    runId:process.env.GITHUB_RUN_ID||'local',
    stage:'builder-failure',
    error:checkpoint.error,
    expected:'Builder objective completes with verification passing',
    actual:checkpoint.error,
    files,
    evidence:[checkpointPath,evidencePath],
    attempted:task?.implementation||[],
    retryable:true,
    repairHint:`Repair blocked Builder task ${checkpoint.blockedTask||checkpoint.currentTask||'unknown'} using the isolated Repair Bot.`,
    metadata:{objectiveId:checkpoint.objectiveId||null,taskId:checkpoint.blockedTask||checkpoint.currentTask||null,taskFiles:task?.files||[],changedFiles:changed,evidenceUnits:evidence?.units?.length||0}
  });
}
async function runReviewer(reviewerWorker,baseCommit,candidateCommit){
  if(!validCommit(baseCommit)||!validCommit(candidateCommit))fail('Reviewer handoff requires full base and candidate commit SHAs.');
  const { execFileSync:run }=await import('node:child_process');
  const env={...process.env,AUTOBOT_REVIEW_BASE_COMMIT:baseCommit,AUTOBOT_REVIEW_COMMIT:candidateCommit,AUTOBOT_REVIEW_OUTPUT:path.join(root,'builder','working','autobot-review.json')};
  try{
    run(process.execPath,[reviewerWorker.entrypoint],{cwd:root,env,stdio:'inherit'});
    return {status:'pass'};
  }catch(error){
    if(error.status===3)return {status:'needs-repair'};
    if(error.status===2)return {status:'reject'};
    throw error;
  }
}
function writeState(state){fs.writeFileSync(fleetStatePath,JSON.stringify({...state,updatedAt:new Date().toISOString()},null,2)+'\n');}
export function captureBuilderFailure(){return captureFailure();}
export async function recoverFleet({failureId=null}={}){
  const registry=readJson(registryPath);
  if(registry.enabled!==true||registry.coordination?.mode!=='active')fail('AutoBot fleet execution is disabled; recovery orchestration must be explicitly activated after foundation verification.');
  const {worker:repairWorker,module:repairModule}=await loadWorker(registry,'repair');
  const {worker:qaWorker,module:qaModule}=await loadWorker(registry,'qa');
  const {worker:reviewerWorker}=await loadWorker(registry,'reviewer');
  if(typeof repairModule.repairOne!=='function')fail(`Registered Repair Bot '${repairWorker.entrypoint}' does not export repairOne.`);
  if(typeof qaModule.qaOne!=='function')fail(`Registered QA Bot '${qaWorker.entrypoint}' does not export qaOne.`);
  let failure=failureId?readFailures({status:'open'}).find(item=>item.id===failureId):null;
  if(!failure)failure=readFailures({status:'open'})[0]||null;
  if(!failure)return {ok:true,status:'no-open-failure'};
  writeState({schemaVersion:1,status:'repairing',failureId:failure.id});
  const repair=repairModule.repairOne({failureId:failure.id});
  if(!repair?.ok)fail('Repair Bot did not return a successful repair handoff.');
  writeState({schemaVersion:1,status:'qa',failureId:failure.id,repair});
  const qa=qaModule.qaOne({failureId:failure.id});
  if(!qa?.ok)fail('QA Bot did not verify the repaired handoff.');
  writeState({schemaVersion:1,status:'reviewing',failureId:failure.id,repair,qa});
  const review=await runReviewer(reviewerWorker,qa.baseCommit,qa.repairCommit);
  const finalStatus=review.status==='pass'?'verified-candidate':review.status==='needs-repair'?'review-needs-repair':'review-rejected';
  const result={ok:review.status==='pass',status:finalStatus,failureId:failure.id,repair,qa,review,protectedIntegration:false};
  writeState(result);
  return result;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const command=process.argv[2]||'recover';
  const failureId=process.argv[3]||null;
  if(command==='capture')console.log(JSON.stringify(captureBuilderFailure(),null,2));
  else if(command==='recover')console.log(JSON.stringify(await recoverFleet({failureId}),null,2));
  else fail(`unknown command: ${command}`);
}
