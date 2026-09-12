#!/usr/bin/env node
/** Verify the multi-bot foundation without activating it. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const registryFile='builder/brain/autobot-fleet.json';
const coordinatorFile='builder/runner/autobot-coordinator.mjs';
const queueFile='builder/runner/autobot-failure-queue.mjs';
const foundationDoc='builder/brain/autobot-fleet-foundation.md';
const workflow='.github/workflows/autonomous-builder-v2-fast.yml';
const registry=JSON.parse(fs.readFileSync(path.join(root,registryFile),'utf8'));
const coordinator=fs.readFileSync(path.join(root,coordinatorFile),'utf8');
const queue=fs.readFileSync(path.join(root,queueFile),'utf8');
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
assert(coordinator.includes('mode:registry.coordination?.mode||\'plan-only\''),'coordinator must discover its mode from registry');
assert(coordinator.includes('activationBlocked:registry.enabled!==true||registry.coordination?.mode!==\'active\''),'coordinator must block activation while foundation is disabled');
assert(coordinator.includes('No worker is launched by this foundation coordinator.'),'coordinator must not launch workers in foundation mode');
assert(queue.includes("const SCHEMA_VERSION=1"),'failure queue schema marker missing');
assert(queue.includes("const STATUSES=new Set(['open','claimed','repairing','repaired','verified','rejected','blocked'])"),'failure queue status contract missing');
assert(queue.includes('export function appendFailure'),'failure queue append API missing');
assert(queue.includes('export function readFailures'),'failure queue read API missing');
assert(queue.includes('export function transitionFailure'),'failure queue transition API missing');
assert(queue.includes('append-only'),'failure queue must preserve historical evidence');
assert(doc.includes('Protected Builder'),'foundation document must describe the protected builder');
assert(doc.includes('Failure Queue'),'foundation document must describe the failure queue');
assert(doc.includes('Coordinator'),'foundation document must describe the coordinator');
assert(doc.includes('must be registered here and covered by the fleet verifier'),'discoverability contract must be documented');
assert(!workflowText.includes('autobot-coordinator.mjs'),'existing production workflow must not activate the new coordinator yet');
assert(!workflowText.includes('autobot-repair.mjs'),'existing production workflow must not activate an unimplemented repair bot');
execFileSync(process.execPath,['--check',coordinatorFile],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,['--check',queueFile],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,schemaVersion:1,mode:registry.coordination.mode,enabled:registry.enabled,bots:registry.bots.map(bot=>({id:bot.id,status:bot.status,protected:Boolean(bot.protected)})),failureStateMachine:['open','claimed','repairing','repaired','verified','rejected','blocked'],workflowActivation:false,protectedBuilder:'builder/runner/aider-feature-brain.mjs'}));
