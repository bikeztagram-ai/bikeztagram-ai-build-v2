#!/usr/bin/env node
/** Verify the AutoBot fleet recovery contract in foundation or temporary live-test mode. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const registry=JSON.parse(read('builder/brain/autobot-fleet.json'));
const workflow=read('.github/workflows/autobot-fleet-recovery.yml');
const recovery=read('builder/runner/autobot-fleet-recovery.mjs');
const handoff=read('builder/runner/autobot-verified-candidate-handoff.mjs');
const live=registry.status==='fifteen-minute-live-test'&&registry.enabled===true&&registry.coordination?.mode==='active';
const foundation=registry.enabled===false&&registry.coordination?.mode==='plan-only';
assert(live||foundation,'fleet recovery must be either disabled/plan-only or the explicit fifteen-minute live-test state');
assert(registry.activationGate?.requiredEnabled===true&&registry.activationGate?.requiredMode==='active','Registry must declare the exact recovery activation gate');
assert(registry.activationGate?.protectedIntegration===false,'Recovery must preserve the protected-integration boundary');
assert(/registry\.enabled\s*!==\s*true\s*\|\|\s*registry\.coordination\?\.mode\s*!==\s*['"]active['"]/.test(recovery),'Recovery runner must refuse execution outside the activation gate');
assert(recovery.includes('autobot-builder-candidate.patch'),'Recovery must require the real Builder candidate patch');
assert(recovery.includes('AUTOBOT_REPAIR_BASE_COMMIT'),'Recovery must preserve the exact repair base evidence');
assert(workflow.includes('workflow_run')&&workflow.includes('workflow_dispatch'),'Recovery workflow must support controlled recovery invocation');
assert(workflow.includes("mode !== 'active'")||workflow.includes("mode!=='active'"),'Recovery workflow must enforce the active-mode gate');
assert(workflow.includes('protectedIntegration'),'Recovery workflow must preserve protected integration gating');
assert(handoff.includes('integration-eligible')&&handoff.includes('automaticMerge:false')&&handoff.includes('automaticPush:false'),'Verified handoff must remain integration-eligible only and never auto-merge or auto-push');
for(const file of ['builder/runner/autobot-fleet-recovery.mjs','builder/runner/autobot-verified-candidate-handoff.mjs','scripts/autobot/verify-autobot-verified-candidate-integration.mjs'])execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,state:live?'fifteen-minute-live-test':'disabled-plan-only',enabled:registry.enabled,mode:registry.coordination.mode,protectedIntegration:false,realBuilderCandidateRequired:true,automaticMerge:false,automaticPush:false}));
