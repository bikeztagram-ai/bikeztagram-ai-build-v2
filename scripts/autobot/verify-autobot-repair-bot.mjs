#!/usr/bin/env node
/** Verify the isolated Repair Bot contract and its durable handoff lifecycle. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const repairFile='builder/runner/autobot-repair.mjs';
const queueFile='builder/runner/autobot-failure-queue.mjs';
const registryFile='builder/brain/autobot-fleet.json';
const repair=fs.readFileSync(path.join(root,repairFile),'utf8');
const queue=fs.readFileSync(path.join(root,queueFile),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryFile),'utf8'));
function assert(condition,message){if(!condition)throw new Error(message);}
assert(repair.includes('AutoBot Repair Bot'),'Repair Bot identity marker missing');
assert(repair.includes("from './autobot-failure-queue.mjs'"),'Repair Bot must discover the durable queue through the exact runner path');
assert(repair.includes("transitionFailure(record.id,'claimed'"),'Repair Bot must claim failures before repair');
assert(repair.includes("transitionFailure(record.id,'repairing'"),'Repair Bot must record the repairing state');
assert(repair.includes("transitionFailure(record.id,'repaired'"),'Repair Bot must record verified isolated repair state');
assert(repair.includes("transitionFailure(record.id,'blocked'"),'Repair Bot must hand off unrepaired failures as blocked');
assert(repair.includes("git(['worktree','add','-b',branch,worktree,baseCommit])"),'Repair Bot must isolate repairs from the exact recorded base commit');
assert(repair.includes("const baseCommit=git(['rev-parse','HEAD'])"),'Repair Bot must record the protected checkout base before editing');
assert(repair.includes('repairBaseCommit:baseCommit'),'Repair Bot must persist the exact base commit in repair handoff evidence');
assert(repair.includes("'--no-auto-commits'"),'Aider must not auto-commit inside the Repair Bot');
assert(repair.includes("git(['commit','-m',`fix(autobot): repair failure ${record.id}`],worktree)"),'Repair Bot must create a focused repair commit only after verification');
assert(repair.includes("const unauthorized=changed.filter(file=>!files.includes(file))"),'Repair Bot must enforce the failure file scope');
assert(repair.includes("npm run build"),'Repair Bot must verify the isolated build');
assert(repair.includes("npm run verify:autobot-product-change-quality"),'Repair Bot must run the product-quality guard');
assert(!repair.includes("git(['merge'"),'Repair Bot must not contain a merge operation');
assert(!repair.includes("git(['push'"),'Repair Bot must not push repairs automatically');
assert(repair.includes("builder/runner/aider-feature-brain.mjs"),'Protected Builder must be explicitly excluded from Repair Bot edits');
const repairBot=registry.bots.find(bot=>bot.id==='repair');
assert(repairBot?.entrypoint===repairFile,'registry repair entrypoint must exactly match the implemented Repair Bot path');
assert(repairBot?.status==='verified','Repair Bot must be registry-marked verified only after this contract exists');
assert(repairBot?.protected===false,'Repair Bot must remain unprotected');
assert(queue.includes("const STATUSES=new Set(['open','claimed','repairing','repaired','verified','rejected','blocked'])"),'queue must expose the full Repair Bot lifecycle');
assert(queue.includes('repairBaseCommit:normalise(input.repairBaseCommit)'),'queue must persist repair base commit handoff metadata');

const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'bikeztagram-repair-contract-'));
const tempQueue=path.join(tempDir,'failure.jsonl');
try{
  process.env.AUTOBOT_FAILURE_QUEUE_PATH=tempQueue;
  const queueModule=await import(`../../${queueFile}?repair-contract=${Date.now()}`);
  const repairModule=await import(`../../${repairFile}?repair-contract=${Date.now()}`);
  const base='0123456789abcdef0123456789abcdef01234567';
  const commit='abcdef0123456789abcdef0123456789abcdef01';
  const created=queueModule.appendFailure({source:'repair-contract-test',stage:'verification',error:'synthetic failure',files:['src/aiEditPlanner.js'],evidence:['contract-test'],retryable:true});
  assert(queueModule.readFailures({status:'open'}).length===1,'synthetic failure must enter OPEN state');
  queueModule.transitionFailure(created.id,'claimed',{transitionedBy:'repair-contract-test'});
  queueModule.transitionFailure(created.id,'repairing',{transitionedBy:'repair-contract-test',repairBranch:'autobot-repair/test',repairBaseCommit:base});
  queueModule.transitionFailure(created.id,'repaired',{transitionedBy:'repair-contract-test',repairBranch:'autobot-repair/test',repairBaseCommit:base,repairCommit:commit});
  queueModule.transitionFailure(created.id,'verified',{transitionedBy:'repair-contract-test',repairBranch:'autobot-repair/test',repairBaseCommit:base,repairCommit:commit,resolution:'contract test'});
  const latest=queueModule.readFailures().find(record=>record.id===created.id);
  assert(latest?.status==='verified','append-only queue must fold the latest status by failure id');
  assert(latest?.repairBaseCommit===base,'repair base commit must survive the full handoff lifecycle');
  const plan=repairModule.repairPlan({failureId:'missing'});
  assert(plan.status==='no-open-failure','Repair Bot must report no-open-failure for an unknown id');
  assert(queueModule.readFailures().length===1,'queue transition test must retain one folded failure record');
}finally{
  fs.rmSync(tempDir,{recursive:true,force:true});
}

execFileSync(process.execPath,['--check',repairFile],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,['--check',queueFile],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,repairEntrypoint:repairFile,queueLifecycle:['open','claimed','repairing','repaired','verified','rejected','blocked'],isolatedWorktree:true,automaticPush:false,automaticMerge:false,productQualityGuard:true}));
