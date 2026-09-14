#!/usr/bin/env node
/** Verify the AutoBot fleet foundation, including the temporary fifteen-minute live shakedown state. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const registry=JSON.parse(read('builder/brain/autobot-fleet.json'));
const pkg=JSON.parse(read('package.json'));
const workflow=read('.github/workflows/autonomous-builder-v2-fast.yml');
const validation=read('.github/workflows/autobot-fleet-foundation-validation.yml');
const coordinator=read('builder/runner/autobot-coordinator.mjs');
const recovery=read('builder/runner/autobot-fleet-recovery.mjs');

assert(registry.schemaVersion===1,'fleet registry schema must be v1');
const live=registry.status==='fifteen-minute-live-test'&&registry.enabled===true&&registry.coordination?.mode==='active'&&registry.activationGate?.testDuration==='15m';
const foundation=registry.enabled===false&&registry.coordination?.mode==='plan-only';
assert(live||foundation,'fleet must be either the protected plan-only foundation state or the explicitly registered fifteen-minute live-test state');
if(live){
  assert(registry.activationGate?.protectedIntegration===false,'live shakedown must keep protected integration disabled');
  assert(registry.activationGate?.requiredEnabled===true&&registry.activationGate?.requiredMode==='active','live shakedown activation gate contract changed');
  assert(registry.coordination?.maxConcurrentWorkers===1,'live shakedown must remain single-worker');
  assert(registry.coordination?.requireIsolatedWorker===true,'isolated worker requirement missing');
  assert(registry.coordination?.requireVerificationBeforeHandoff===true,'verification-before-handoff requirement missing');
  assert(registry.coordination?.requireHumanReviewBeforeProtectedIntegration===true,'human review boundary missing');
  assert(registry.purpose.includes('fifteen-minute end-to-end'),'live state must explicitly describe the fifteen-minute end-to-end shakedown');
}
const builder=registry.bots.find((bot)=>bot.id==='builder');
assert(builder?.entrypoint==='builder/runner/aider-feature-brain.mjs'&&builder?.status==='proven'&&builder?.protected===true,'protected proven Builder contract changed');
for(const bot of registry.bots){assert(bot.id&&bot.role&&bot.entrypoint&&bot.status,`registry bot metadata incomplete: ${bot.id||'unknown'}`);if(bot.id!=='builder')assert(bot.protected===false,`non-protected bot unexpectedly protected: ${bot.id}`);}
for(const id of ['repair','qa','reviewer','self-improvement']){const bot=registry.bots.find((item)=>item.id===id);assert(bot?.status==='verified',`${id} registry contract must remain verified`);}
const specialists=registry.bots.filter((bot)=>bot.specialistBuilder===true);
assert(specialists.length>=2,'at least two specialist Builder roles are required before fleet activation');
assert(coordinator.includes("registry.enabled!==true || registry.coordination?.mode!=='active'"),'Coordinator activation gate must remain explicit');
assert(recovery.includes("registry.enabled!==true || registry.coordination?.mode!=='active'"),'Recovery activation gate must remain explicit');
assert(recovery.includes('protectedIntegration'),'Recovery runner must enforce the protected integration boundary');
assert(workflow.includes("options: ['15m','30m','1h','2h','3h','4h','5h','6h']"),'Builder duration options changed unexpectedly');
assert(validation.includes('workflow_dispatch'),'foundation validation workflow must remain manually runnable');
for(const forbidden of ['builder/runner/autobot-repair.mjs','builder/runner/autobot-qa.mjs','builder/runner/autobot-reviewer.mjs','builder/runner/autobot-specialist-builder.mjs'])assert(!workflow.includes(forbidden),`production Builder workflow must not directly activate downstream worker: ${forbidden}`);
for(const file of ['builder/runner/autobot-coordinator.mjs','builder/runner/autobot-fleet-recovery.mjs','builder/runner/autobot-repair.mjs','builder/runner/autobot-qa.mjs','builder/runner/autobot-reviewer.mjs','builder/runner/autobot-specialist-builder.mjs','builder/runner/autobot-specialist-handoff.mjs'])execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
assert(pkg.scripts?.['verify:autobot-fleet-foundation']==='node scripts/autobot/verify-autobot-fleet-foundation.mjs','foundation verifier package contract changed');
console.log(JSON.stringify({ok:true,state:live?'fifteen-minute-live-test':'disabled-plan-only',enabled:registry.enabled,mode:registry.coordination.mode,protectedIntegration:registry.activationGate?.protectedIntegration===false,maxConcurrentWorkers:registry.coordination?.maxConcurrentWorkers,specialistBuilders:specialists.map((bot)=>bot.id)}));
