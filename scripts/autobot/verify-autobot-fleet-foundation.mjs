#!/usr/bin/env node
/** Verify the AutoBot fleet foundation and current gated parallel-worker architecture. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const registry=json('builder/brain/autobot-fleet.json');
const pkg=json('package.json');
const workflow=read('.github/workflows/autobot-parallel-proven.yml');
const validationWorkflow=read('.github/workflows/autobot-proven-fleet-validation.yml');
const worker=read('builder/runner/proven-fleet-worker.mjs');
const recovery=read('builder/runner/proven-builder-recovery.mjs');
const packages=read('scripts/autobot/create-parallel-proven-packages.mjs');
const outcome=read('scripts/autobot/write-proven-worker-outcome.mjs');
const publisher=read('scripts/autobot/publish-proven-worker-candidate.mjs');
const completed=read('builder/runner/autobot-completed-work.mjs');
const recoveryCore=read('builder/runner/autobot-fleet-recovery.mjs');
const reviewer=read('builder/runner/autobot-reviewer.mjs');

assert(registry.schemaVersion===1,'fleet registry schema must remain v1');
assert(registry.status==='parallel-two-worker-live-test'&&registry.enabled===true&&registry.coordination?.mode==='active','fleet must be explicitly registered as the two-worker live test');
assert(registry.coordination?.maxConcurrentWorkers===2,'fleet must remain bounded at two concurrent workers');
assert(registry.coordination?.requireIsolatedWorker===true,'isolated worker requirement missing');
assert(registry.coordination?.requireVerificationBeforeHandoff===true,'verification-before-handoff requirement missing');
assert(registry.coordination?.requireHumanReviewBeforeProtectedIntegration===true,'human review boundary missing');
assert(registry.activationGate?.protectedIntegration===false,'protected integration must remain disabled during shakedown');
assert(Array.isArray(registry.activationGate?.parallelWorkers)&&registry.activationGate.parallelWorkers.length===2,'exactly two parallel workers must be registered');
assert(registry.activationGate.parallelWorkers.includes('proven-a')&&registry.activationGate.parallelWorkers.includes('proven-b'),'registered live workers must be proven-a and proven-b');

const builder=registry.bots.find(bot=>bot.id==='builder');
assert(builder?.entrypoint==='builder/runner/aider-feature-brain.mjs'&&builder?.status==='proven'&&builder?.protected===true,'protected proven Builder contract changed');
for(const id of ['repair','qa','reviewer']){const bot=registry.bots.find(item=>item.id===id);assert(bot?.status==='verified'&&bot?.protected===false,`${id} must remain verified and unprotected`);}

assert(workflow.includes('proven-a')&&workflow.includes('proven-b'),'parallel workflow must define both proven workers');
assert(workflow.includes('matrix: {worker: [proven-a, proven-b]}'),'parallel workflow must use the exact two-worker matrix');
assert(workflow.includes('builder/runner/proven-fleet-worker.mjs'),'parallel workflow must invoke the proven fleet worker wrapper');
assert(workflow.includes('builder/runner/proven-builder-recovery.mjs'),'parallel workflow must connect gated recovery');
assert(workflow.includes('builder/runner/autobot-completed-work.mjs'),'parallel workflow must publish to the completed-work inbox');
assert(workflow.includes("steps.run_proven.outcome == 'success' && steps.production.outcome == 'success' && steps.publish.outcome == 'success'"),'worker success must require execution, production verification, and publication');
assert(!workflow.includes('gh pr merge')&&!workflow.includes('merge_pull_request'),'parallel workflow must not automatically merge');

assert(worker.includes('long-run-executor.mjs'),'proven fleet worker must delegate to the existing long-run executor');
assert(worker.includes('AUTOBOT_WORK_PACKAGE_PATH'),'worker must receive an explicit work package');
assert(worker.includes('task-library.json')&&worker.includes('roadmap.json')&&worker.includes('autonomous-builder-queue.json'),'worker must isolate and restore the proven Builder state');
assert(packages.includes('cinematic-shot-motion-contract')&&packages.includes('provider-failure-classification'),'shakedown must contain two concrete product tasks');
assert(packages.includes('overlap.length')&&!packages.includes('fileOverlap.length'),'package planner must reject overlapping file scopes');
assert(packages.includes('task.dependsOn'),'package planner must inspect task-level dependencies');
assert(outcome.includes('repairable')&&outcome.includes('candidatePatch'),'worker outcome must distinguish repairable failures');
assert(publisher.includes('verified-candidate')&&publisher.includes('npm run verify:autobot-production-gate'),'candidate publication must require production verification');
assert(publisher.includes('autobot-proven/')&&publisher.includes("execFileSync('git',['push'")&&publisher.includes("'--set-upstream','origin',branch"),'successful workers must publish isolated candidate branches');

assert(recovery.includes('autobot-fleet-recovery.mjs')&&recovery.includes('verified-candidate'),'recovery must use the existing recovery chain and require verified-candidate output');
assert(recovery.includes("execFileSync('git',['worktree','add'")&&recovery.includes("execFileSync('git',['worktree','remove','--force'"),'recovery must use and clean up an isolated git worktree');
assert(recoveryCore.includes('autobot-repair.mjs')&&recoveryCore.includes('autobot-qa.mjs')&&recoveryCore.includes('autobot-reviewer.mjs'),'Repair -> QA -> Reviewer chain must remain connected');
assert(reviewer.includes('automaticMerge:false')&&reviewer.includes('automaticPush:false'),'Reviewer must not merge or push');

assert(completed.includes('autobot-completed-work-v1')&&completed.includes('verified-candidate'),'completed-work inbox must use v1 and accept verified candidates');
assert(completed.includes('ready-for-review')&&completed.includes('needs-recovery'),'completed-work must preserve review/recovery states');
assert(completed.includes('automaticMerge:false'),'completed-work must retain the no-automatic-merge boundary');

const scripts=pkg.scripts||{};
assert(scripts['verify:autobot-fleet-foundation']==='node scripts/autobot/verify-autobot-fleet-foundation.mjs','fleet foundation package script contract changed');
assert(validationWorkflow.includes('workflow_dispatch')&&validationWorkflow.includes('node scripts/autobot/verify-autobot-parallel-proven.mjs'),'dedicated validation must remain manual and run the new fleet verifier');
assert(validationWorkflow.includes('npm run verify:autobot-fleet-recovery')&&validationWorkflow.includes('npm run verify:autobot-production-gate'),'dedicated validation must exercise recovery and production gates');

console.log(JSON.stringify({ok:true,state:'parallel-two-worker-live-test',workers:['proven-a','proven-b'],engine:'builder/runner/long-run-executor.mjs',recovery:'Repair -> QA -> Reviewer',handoff:'central completed-work inbox',automaticMerge:false},null,2));
