#!/usr/bin/env node
/** Verify the AutoBot fleet foundation and every registered discovery contract. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const registryPath='builder/brain/autobot-fleet.json';
const packagePath='package.json';
const workflowPath='.github/workflows/autonomous-builder-v2-fast.yml';
const validationWorkflowPath='.github/workflows/autobot-fleet-foundation-validation.yml';
const docPath='builder/brain/autobot-fleet-foundation.md';
const coordinatorPath='builder/runner/autobot-coordinator.mjs';
const queuePath='builder/runner/autobot-failure-queue.mjs';
const repairPath='builder/runner/autobot-repair.mjs';
const qaPath='builder/runner/autobot-qa.mjs';
const reviewerPath='builder/runner/autobot-reviewer.mjs';
const reviewerHandoffPath='scripts/autobot/verify-autobot-reviewer-handoff.mjs';
const specialistPath='builder/runner/autobot-specialist-builder.mjs';
const specialistVerifierPath='scripts/autobot/verify-autobot-specialist-builder.mjs';
const specialistHandoffPath='builder/runner/autobot-specialist-handoff.mjs';
const specialistHandoffVerifierPath='scripts/autobot/verify-autobot-specialist-handoff.mjs';
const selfImprovementPath='builder/runner/autobot-self-improvement.mjs';
const selfImprovementVerifierPath='scripts/autobot/verify-autobot-self-improvement.mjs';
const repairVerifierPath='scripts/autobot/verify-autobot-repair-bot.mjs';
const qaVerifierPath='scripts/autobot/verify-autobot-qa.mjs';
const reviewerVerifierPath='scripts/autobot/verify-autobot-reviewer.mjs';
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function assert(condition,message){if(!condition)throw new Error(message);}
const registry=JSON.parse(read(registryPath)); const pkg=JSON.parse(read(packagePath)); const workflow=read(workflowPath); const validationWorkflow=read(validationWorkflowPath); const doc=read(docPath); const coordinator=read(coordinatorPath); const queue=read(queuePath); const reviewer=read(reviewerPath); const specialist=read(specialistPath); const specialistHandoff=read(specialistHandoffPath);
assert(registry.schemaVersion===1,'fleet registry schema must be v1');
assert(registry.enabled===false,'fleet foundation must remain disabled until separately verified');
assert(registry.coordination?.mode==='plan-only','fleet foundation must remain plan-only');
assert(registry.coordination?.coordinator===coordinatorPath,'registry coordinator path must exactly match implementation');
assert(registry.coordination?.failureQueue==='builder/working/autobot-failure-queue.jsonl','registry failure queue path must exactly match durable evidence path');
assert(registry.coordination?.sharedEvidence==='builder/working/autobot-fleet-plan.json','registry shared evidence path must exactly match coordinator output path');
assert(registry.coordination?.specialistHandoff==='builder/working/autobot-specialist-handoff.json','registry specialist handoff output path must exactly match the durable handoff path');
assert(registry.coordination?.specialistHandoffContract===specialistHandoffPath,'registry specialist handoff contract path must exactly match implementation');
assert(registry.coordination?.specialistHandoffVerifier===specialistHandoffVerifierPath,'registry specialist handoff verifier path must exactly match verifier');
assert(registry.coordination?.maxConcurrentWorkers===1,'fleet foundation must remain single-worker until controlled parallelism is separately verified');
assert(registry.coordination?.requireIsolatedWorker===true,'isolated worker requirement missing');
assert(registry.coordination?.requireVerificationBeforeHandoff===true,'verification-before-handoff requirement missing');
const builder=registry.bots.find(bot=>bot.id==='builder');
assert(builder?.entrypoint==='builder/runner/aider-feature-brain.mjs'&&builder?.status==='proven'&&builder?.protected===true,'protected proven Builder contract changed');
for(const bot of registry.bots){assert(bot.id&&bot.role&&bot.entrypoint&&bot.status,`registry bot metadata incomplete: ${bot.id||'unknown'}`);if(bot.id!=='builder')assert(bot.protected===false,`non-protected bot unexpectedly protected: ${bot.id}`);if(bot.status==='planned')assert(bot.entrypoint.startsWith('future:'),`planned bot must use future: entrypoint: ${bot.id}`);}
const implemented={repair:{id:'repair',entrypoint:repairPath},qa:{id:'qa',entrypoint:qaPath},reviewer:{id:'reviewer',entrypoint:reviewerPath},selfImprovement:{id:'self-improvement',entrypoint:selfImprovementPath}};
for(const {id,entrypoint} of Object.values(implemented)){const bot=registry.bots.find(item=>item.id===id);assert(bot?.entrypoint===entrypoint&&bot?.status==='verified',`${id} registry contract must exactly match its verified implementation`);assert(fs.existsSync(path.join(root,entrypoint)),`${id} implementation path is missing: ${entrypoint}`);}
const specialists=registry.bots.filter(bot=>bot.specialistBuilder===true); assert(specialists.length>=2,'at least two specialist Builder roles are required before fleet activation');
const expectedScopes={'director-builder':['src/director.js','src/aiEditPlanner.js'],'timeline-builder':['src/executableTimeline.js','src/editorialRhythm.js','src/renderer.js']};
for(const bot of specialists){assert(bot.entrypoint===specialistPath,`specialist Builder ${bot.id} must use the exact shared runner path`);assert(bot.status==='verified'&&bot.protected===false,`specialist Builder ${bot.id} must be verified and unprotected`);assert(JSON.stringify(bot.ownsFiles)===JSON.stringify(expectedScopes[bot.id]),`specialist Builder ${bot.id} ownsFiles contract is stale or unexpected`);for(const file of bot.ownsFiles){assert(!path.isAbsolute(file)&&!file.includes('..')&&!file.startsWith('.')&&!file.includes('\\'),`unsafe specialist scope: ${bot.id}:${file}`);assert(fs.existsSync(path.join(root,file)),`specialist scope points to missing file: ${bot.id}:${file}`);}}
assert(specialist.includes('AUTOBOT_SPECIALIST_BOT_ID')&&specialist.includes('AUTOBOT_SPECIALIST_OBJECTIVE')&&specialist.includes('AUTOBOT_SPECIALIST_BUILDER_ENABLED'),'specialist Builder discovery contracts missing');
assert(specialist.includes("registry.enabled!==true || registry.coordination?.mode!=='active'"),'specialist Builder must refuse execution while fleet is inactive');
assert(specialist.includes('bot.specialistBuilder')&&specialist.includes('ownsFiles')&&specialist.includes('candidateCommit'),'specialist Builder registry scope/candidate handoff wiring missing');
assert(specialist.includes("AUTOBOT_SPECIALIST_PRODUCT_QUALITY_CHECK||'npm run verify:autobot-product-change-quality'"),'specialist Builder must expose the exact product-quality verification command contract');
assert(specialist.includes("git(['diff','HEAD','--name-only']"),'specialist Builder must inspect staged and unstaged changes from HEAD');
assert(specialist.includes("git(['status','--porcelain']"),'specialist Builder must inspect untracked/staged working-tree changes');
assert(specialist.includes("writeSpecialistHandoff({")&&specialist.includes("status:'verified-candidate'"),'specialist Builder must emit the validated specialist handoff');
assert(specialistHandoff.includes("SPECIALIST_HANDOFF_SCHEMA='autobot-specialist-handoff-v1'"),'specialist handoff schema must remain v1');
assert(specialistHandoff.includes("DEFAULT_SPECIALIST_HANDOFF_PATH='builder/working/autobot-specialist-handoff.json'"),'specialist handoff default output path must remain exact');
assert(specialistHandoff.includes("downstream?.reviewContract!=='AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT'"),'specialist handoff must validate the exact downstream Reviewer contract');
assert(read(specialistHandoffVerifierPath).includes('verify:autobot-specialist-handoff'),'specialist handoff verifier must expose its exact package discoverability anchor');
assert(read(specialistHandoffVerifierPath).includes('writeSpecialistHandoff')&&read(specialistHandoffVerifierPath).includes('candidateCommit'),'specialist handoff verifier must cover producer and candidate commit wiring');
assert(coordinator.includes("const specialistBotId=String(process.env.AUTOBOT_SPECIALIST_BOT_ID||'').trim()"),'Coordinator must discover the exact specialist bot id contract');
assert(coordinator.includes("const specialistObjective=String(process.env.AUTOBOT_SPECIALIST_OBJECTIVE||'').trim()"),'Coordinator must discover the exact specialist objective contract');
assert(coordinator.includes("kind:'specialist-builder-required'"),'Coordinator must expose a specialist Builder handoff decision');
assert(coordinator.includes("objective:specialistObjective,ownsFiles:Array.isArray(specialist.ownsFiles)?specialist.ownsFiles:[]"),'Coordinator must persist the exact specialist objective and registry ownership scope');
assert(coordinator.includes("contract:'AUTOBOT_SPECIALIST_BOT_ID + AUTOBOT_SPECIALIST_OBJECTIVE'"),'Coordinator must publish the exact specialist handoff contract wording');
assert(coordinator.includes("const specialist=worker(registry,specialistBotId)"),'Coordinator must resolve specialist workers from the authoritative registry');
const scripts=pkg.scripts||{};
const scriptContracts={'verify:autobot-fleet-foundation':'node scripts/autobot/verify-autobot-fleet-foundation.mjs','verify:autobot-repair-bot':`node ${repairVerifierPath}`,'verify:autobot-qa':`node ${qaVerifierPath}`,'verify:autobot-reviewer':`node ${reviewerVerifierPath}`,'verify:autobot-reviewer-handoff':`node ${reviewerHandoffPath}`,'verify:autobot-specialist-builder':`node ${specialistVerifierPath}`,'verify:autobot-specialist-handoff':`node ${specialistHandoffVerifierPath}`,'verify:autobot-self-improvement':`node ${selfImprovementVerifierPath}`};
for(const [name,expected] of Object.entries(scriptContracts))assert(scripts[name]===expected,`${name} package discoverability contract is wrong`);
assert(read(specialistVerifierPath).includes("'verify:autobot-specialist-builder'"),'specialist verifier must discover its exact package/main-suite anchor');
assert(read(specialistVerifierPath).includes('director-builder')&&read(specialistVerifierPath).includes('timeline-builder'),'specialist verifier must cover both registered specialist roles');
assert(read(reviewerHandoffPath).includes('AUTOBOT_REVIEW_BASE_COMMIT')&&read(reviewerHandoffPath).includes('AUTOBOT_REVIEW_COMMIT'),'Reviewer handoff verifier must expose exact commit contracts');
assert(reviewer.includes('AUTOBOT_REVIEW_BASE_COMMIT')&&reviewer.includes('AUTOBOT_REVIEW_COMMIT'),'Reviewer must consume exact commit contracts');
assert(reviewer.includes("automaticMerge:false")&&reviewer.includes("automaticPush:false"),'Reviewer must remain unable to merge or push');
assert(queue.includes("const STATUSES=new Set(['open','claimed','repairing','repaired','verified','rejected','blocked'])")&&queue.includes('const ALLOWED_TRANSITIONS='),'failure queue state machine contract missing');
assert(read(selfImprovementVerifierPath).includes('AUTOBOT_FAILURE_QUEUE_PATH')&&read(selfImprovementVerifierPath).includes('requiresHumanReview'),'Self-Improvement verifier must cover exact evidence contracts and human review');
assert(doc.includes('Specialist Builder Fleet')&&doc.includes('Director Builder')&&doc.includes('Timeline Builder'),'foundation documentation must describe specialist Builders');
assert(doc.includes('AUTOBOT_SPECIALIST_BOT_ID')&&doc.includes('AUTOBOT_SPECIALIST_OBJECTIVE')&&doc.includes('AUTOBOT_SPECIALIST_BUILDER_ENABLED'),'foundation documentation must contain exact specialist discovery wording');
assert(doc.includes('builder/runner/autobot-specialist-handoff.mjs')&&doc.includes('builder/working/autobot-specialist-handoff.json'),'foundation documentation must describe the specialist handoff paths');
assert(doc.includes(validationWorkflowPath),'foundation documentation must point to the dedicated validation workflow');
assert(validationWorkflow.includes('workflow_dispatch')&&validationWorkflow.includes('npm run verify:autobot-fleet-foundation'),'dedicated validation workflow must be manually runnable and invoke the fleet verifier');
assert(validationWorkflow.includes('node builder/runner/autobot-coordinator.mjs'),'dedicated validation workflow must exercise the plan-only Coordinator');
assert(validationWorkflow.includes('p.activationBlocked!==true')&&validationWorkflow.includes('p.enabled!==false')&&validationWorkflow.includes("p.mode!=='plan-only'"),'dedicated validation workflow must prove the fleet remains disabled and plan-only');
for(const forbidden of [coordinatorPath,repairPath,qaPath,reviewerPath,selfImprovementPath,specialistPath])assert(!workflow.includes(forbidden),`production workflow must not activate new AutoBot worker: ${forbidden}`);
for(const forbidden of [repairPath,qaPath,reviewerPath,selfImprovementPath,specialistPath])assert(!validationWorkflow.includes(`run node ${forbidden}`),`foundation validation workflow must not execute an autonomous worker: ${forbidden}`);

const queueTestDir=fs.mkdtempSync(path.join(os.tmpdir(),'autobot-fleet-queue-test-')); const queueTestPath=path.join(queueTestDir,'failure-queue.jsonl');
try{const env={...process.env,AUTOBOT_FAILURE_QUEUE_PATH:queueTestPath}; const script=`import {appendFailure,transitionFailure,readFailures} from './builder/runner/autobot-failure-queue.mjs'; const f=appendFailure({source:'fleet-verifier',runId:'synthetic',stage:'verification',error:'synthetic failure',files:['src/director.js'],retryable:true}); transitionFailure(f.id,'claimed',{transitionedBy:'fleet-verifier'}); transitionFailure(f.id,'repairing',{transitionedBy:'fleet-verifier'}); transitionFailure(f.id,'repaired',{transitionedBy:'fleet-verifier',repairBaseCommit:'1111111111111111111111111111111111111111',repairCommit:'2222222222222222222222222222222222222222'}); transitionFailure(f.id,'verified',{transitionedBy:'fleet-verifier'}); let rejected=false; try{transitionFailure(f.id,'open',{transitionedBy:'fleet-verifier'});}catch{rejected=true;} if(!rejected)throw new Error('failure queue accepted an illegal backward transition'); const r=readFailures()[0]; if(r.status!=='verified'||r.repairBaseCommit!=='1111111111111111111111111111111111111111'||r.repairCommit!=='2222222222222222222222222222222222222222')throw new Error('failure queue lost terminal repair evidence');`; execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:root,env,stdio:'inherit'});}finally{fs.rmSync(queueTestDir,{recursive:true,force:true});}
for(const file of [coordinatorPath,queuePath,repairPath,qaPath,reviewerPath,specialistPath,specialistHandoffPath,selfImprovementPath,repairVerifierPath,qaVerifierPath,reviewerVerifierPath,reviewerHandoffPath,specialistVerifierPath,specialistHandoffVerifierPath,selfImprovementVerifierPath])execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,enabled:registry.enabled,mode:registry.coordination.mode,protectedBuilder:builder.entrypoint,specialistBuilders:specialists.map(bot=>({id:bot.id,entrypoint:bot.entrypoint,ownsFiles:bot.ownsFiles})),specialistHandoff:{output:registry.coordination.specialistHandoff,contract:registry.coordination.specialistHandoffContract,verifier:registry.coordination.specialistHandoffVerifier},validationWorkflow:validationWorkflowPath,workflowActivation:false,failureQueueBehavioralTest:true,contracts:Object.keys(scriptContracts)}));
