#!/usr/bin/env node
/** Verify the multi-bot foundation without activating it. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const registryFile='builder/brain/autobot-fleet.json';
const coordinatorFile='builder/runner/autobot-coordinator.mjs';
const queueFile='builder/runner/autobot-failure-queue.mjs';
const repairFile='builder/runner/autobot-repair.mjs';
const qaFile='builder/runner/autobot-qa.mjs';
const repairVerifierFile='scripts/autobot/verify-autobot-repair-bot.mjs';
const qaVerifierFile='scripts/autobot/verify-autobot-qa.mjs';
const foundationDoc='builder/brain/autobot-fleet-foundation.md';
const workflow='.github/workflows/autonomous-builder-v2-fast.yml';
const registry=JSON.parse(fs.readFileSync(path.join(root,registryFile),'utf8'));
const coordinator=fs.readFileSync(path.join(root,coordinatorFile),'utf8');
const queue=fs.readFileSync(path.join(root,queueFile),'utf8');
const repair=fs.readFileSync(path.join(root,repairFile),'utf8');
const qa=fs.readFileSync(path.join(root,qaFile),'utf8');
const repairVerifier=fs.readFileSync(path.join(root,repairVerifierFile),'utf8');
const qaVerifier=fs.readFileSync(path.join(root,qaVerifierFile),'utf8');
const doc=fs.readFileSync(path.join(root,foundationDoc),'utf8');
const workflowText=fs.readFileSync(path.join(root,workflow),'utf8');
function assert(condition,message){if(!condition)throw new Error(message);}
assert(registry.schemaVersion===1,'fleet registry schema must be v1');
assert(registry.enabled===false,'fleet foundation must remain disabled until separately verified');
assert(registry.coordination?.mode==='plan-only','fleet foundation must remain plan-only');
assert(registry.coordination?.coordinator===coordinatorFile,'coordinator path must match registry exactly');
assert(registry.coordination?.failureQueue==='builder/working/autobot-failure-queue.jsonl','failure queue path must match registry exactly');
assert(registry.coordination?.sharedEvidence==='builder/working/autobot-fleet-plan.json','shared evidence path must match registry exactly');
assert(registry.coordination?.requireIsolatedWorker===true,'isolated worker requirement missing');
assert(registry.coordination?.requireVerificationBeforeHandoff===true,'handoff verification requirement missing');
const builder=registry.bots.find(bot=>bot.id==='builder');
assert(builder?.status==='proven','proven builder must remain registered as proven');
assert(builder?.entrypoint==='builder/runner/aider-feature-brain.mjs','proven builder entrypoint changed unexpectedly');
assert(builder?.protected===true,'proven builder must be protected');
for(const bot of registry.bots.filter(bot=>bot.id!=='builder')){
  assert(bot.id&&bot.role&&bot.entrypoint&&bot.status,'every planned bot must have id, role, entrypoint and status');
  if(bot.status==='planned')assert(bot.entrypoint.startsWith('future:'),'planned bot entrypoint must be explicitly marked future until implemented');
}
const repairBot=registry.bots.find(bot=>bot.id==='repair');
const qaBot=registry.bots.find(bot=>bot.id==='qa');
assert(repairBot?.entrypoint===repairFile,'implemented Repair Bot entrypoint must exactly match the registry');
assert(repairBot?.status==='verified','implemented Repair Bot must be registry-marked verified');
assert(repairBot?.protected===false,'Repair Bot must remain unprotected');
assert(qaBot?.entrypoint===qaFile,'implemented QA Bot entrypoint must exactly match the registry');
assert(qaBot?.status==='verified','implemented QA Bot must be registry-marked verified');
assert(qaBot?.protected===false,'QA Bot must remain unprotected');
assert(fs.existsSync(path.join(root,repairFile)),'registered Repair Bot entrypoint must exist');
assert(fs.existsSync(path.join(root,qaFile)),'registered QA Bot entrypoint must exist');
assert(fs.existsSync(path.join(root,repairVerifierFile)),'Repair Bot verifier path must exist');
assert(fs.existsSync(path.join(root,qaVerifierFile)),'QA Bot verifier path must exist');
assert(coordinator.includes('mode:registry.coordination?.mode||\'plan-only\''),'coordinator must discover its mode from registry');
assert(coordinator.includes('activationBlocked:registry.enabled!==true||registry.coordination?.mode!==\'active\''),'coordinator must block activation while foundation is disabled');
assert(coordinator.includes('No worker is launched by this foundation coordinator.'),'coordinator must not launch workers in foundation mode');
assert(queue.includes("const SCHEMA_VERSION=1"),'failure queue schema marker missing');
assert(queue.includes("const STATUSES=new Set(['open','claimed','repairing','repaired','verified','rejected','blocked'])"),'failure queue status contract missing');
assert(queue.includes('const ALLOWED_TRANSITIONS='),'failure queue must define legal state transitions');
assert(queue.includes('repairBaseCommit:normalise(input.repairBaseCommit)'),'failure queue must preserve the repair base commit for independent QA');
assert(queue.includes('export function appendFailure'),'failure queue append API missing');
assert(queue.includes('export function readFailures'),'failure queue read API missing');
assert(queue.includes('export function transitionFailure'),'failure queue transition API missing');
assert(queue.includes('append-only'),'failure queue must preserve historical evidence');
assert(repair.includes('repairBaseCommit:baseCommit'),'Repair Bot must hand the exact repair base commit to QA');
assert(repairVerifier.includes(repairFile),'Repair Bot verifier must name the exact implementation path');
assert(repairVerifier.includes("automaticPush:false"),'Repair Bot verifier must prove automatic push is disabled');
assert(repairVerifier.includes("automaticMerge:false"),'Repair Bot verifier must prove automatic merge is disabled');
assert(qa.includes('repairBaseCommit'),'QA must consume the recorded repair base commit');
assert(qa.includes("transitionFailure(record.id,'verified'"),'QA must own the repaired-to-verified handoff');
assert(qaVerifier.includes(qaFile),'QA verifier must name the exact implementation path');
assert(qaVerifier.includes("automaticPush:false"),'QA verifier must prove automatic push is disabled');
assert(qaVerifier.includes("automaticMerge:false"),'QA verifier must prove automatic merge is disabled');
assert(doc.includes('Protected Builder'),'foundation document must describe the protected builder');
assert(doc.includes('Failure Queue'),'foundation document must describe the failure queue');
assert(doc.includes('Coordinator'),'foundation document must describe the coordinator');
assert(doc.includes('Repair Bot'),'foundation document must describe the Repair Bot');
assert(doc.includes('independent QA'),'foundation document must describe independent QA');
assert(doc.includes('must be registered here and covered by the fleet verifier'),'discoverability contract must be documented');
assert(!workflowText.includes('autobot-coordinator.mjs'),'existing production workflow must not activate the new coordinator yet');
assert(!workflowText.includes('autobot-repair.mjs'),'existing production workflow must not activate the Repair Bot yet');
assert(!workflowText.includes('autobot-qa.mjs'),'existing production workflow must not activate the QA Bot yet');

const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'bikeztagram-fleet-contract-'));
const tempQueue=path.join(tempDir,'failure.jsonl');
try{
  process.env.AUTOBOT_FAILURE_QUEUE_PATH=tempQueue;
  const queueModule=await import(`../../${queueFile}?fleet-contract=${Date.now()}`);
  const created=queueModule.appendFailure({source:'fleet-contract-test',stage:'verification',error:'synthetic failure',files:['src/aiEditPlanner.js']});
  queueModule.transitionFailure(created.id,'claimed',{transitionedBy:'fleet-contract-test'});
  queueModule.transitionFailure(created.id,'repairing',{transitionedBy:'fleet-contract-test',repairBaseCommit:'0123456789abcdef0123456789abcdef01234567'});
  queueModule.transitionFailure(created.id,'repaired',{transitionedBy:'fleet-contract-test',repairBaseCommit:'0123456789abcdef0123456789abcdef01234567',repairCommit:'abcdef0123456789abcdef0123456789abcdef01'});
  queueModule.transitionFailure(created.id,'verified',{transitionedBy:'fleet-contract-test',repairBaseCommit:'0123456789abcdef0123456789abcdef01234567',repairCommit:'abcdef0123456789abcdef0123456789abcdef01'});
  const latest=queueModule.readFailures().find(record=>record.id===created.id);
  assert(latest?.status==='verified','failure queue must fold append-only transitions to latest status');
  assert(latest?.repairBaseCommit==='0123456789abcdef0123456789abcdef01234567','repair base commit must survive every handoff transition');
  let rejected=false;
  try{queueModule.transitionFailure(created.id,'open',{transitionedBy:'fleet-contract-test'});}catch(error){rejected=/invalid failure transition/.test(error.message);}
  assert(rejected,'terminal VERIFIED state must reject backwards transitions');
}finally{
  fs.rmSync(tempDir,{recursive:true,force:true});
}

execFileSync(process.execPath,['--check',coordinatorFile],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,['--check',queueFile],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,['--check',repairFile],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,['--check',qaFile],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,['--check',repairVerifierFile],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,['--check',qaVerifierFile],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,schemaVersion:1,mode:registry.coordination.mode,enabled:registry.enabled,bots:registry.bots.map(bot=>({id:bot.id,status:bot.status,protected:Boolean(bot.protected)})),failureStateMachine:['open','claimed','repairing','repaired','verified','rejected','blocked'],repairBot:repairFile,qaBot:qaFile,workflowActivation:false,protectedBuilder:'builder/runner/aider-feature-brain.mjs'}));
