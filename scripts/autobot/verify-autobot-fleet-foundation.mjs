#!/usr/bin/env node
/** Verify the AutoBot fleet foundation and registered discovery contracts. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const registryPath='builder/brain/autobot-fleet.json';
const workflowPath='.github/workflows/autonomous-builder-v2-fast.yml';
const validationWorkflowPath='.github/workflows/autobot-fleet-foundation-validation.yml';
const coordinatorPath='builder/runner/autobot-coordinator.mjs';
const queuePath='builder/runner/autobot-failure-queue.mjs';
const repairPath='builder/runner/autobot-repair.mjs';
const qaPath='builder/runner/autobot-qa.mjs';
const reviewerPath='builder/runner/autobot-reviewer.mjs';
const specialistPath='builder/runner/autobot-specialist-builder.mjs';
const specialistVerifierPath='scripts/autobot/verify-autobot-specialist-builder.mjs';
const specialistHandoffPath='builder/runner/autobot-specialist-handoff.mjs';
const specialistHandoffVerifierPath='scripts/autobot/verify-autobot-specialist-handoff.mjs';
const selfImprovementPath='builder/runner/autobot-self-improvement.mjs';
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function assert(ok,message){if(!ok)throw new Error(message);}
function has(text,pattern,message){assert(pattern.test(text),message);}
const registry=JSON.parse(read(registryPath));
const pkg=JSON.parse(read('package.json'));
const workflow=read(workflowPath);
const validation=read(validationWorkflowPath);
const coordinator=read(coordinatorPath);
const queue=read(queuePath);
const repair=read(repairPath);
const qa=read(qaPath);
const reviewer=read(reviewerPath);
const specialist=read(specialistPath);
const handoff=read(specialistHandoffPath);
assert(registry.schemaVersion===1,'fleet registry schema must be v1');
const live=registry.enabled===true&&registry.coordination?.mode==='active';
const foundation=registry.enabled===false&&registry.coordination?.mode==='plan-only';
assert(live||foundation,'fleet must be active under an explicit live-test gate or disabled/plan-only');
assert(registry.coordination?.maxConcurrentWorkers>=1&&registry.coordination?.maxConcurrentWorkers<=2,'fleet worker limit must remain bounded at two');
if(live){
  assert(registry.activationGate?.requiredEnabled===true&&registry.activationGate?.requiredMode==='active','live activation contract changed');
  assert(registry.activationGate?.protectedIntegration===false,'protected integration must remain disabled');
  assert(registry.coordination?.requireIsolatedWorker===true,'isolated worker requirement missing');
  assert(registry.coordination?.requireVerificationBeforeHandoff===true,'verification-before-handoff requirement missing');
  assert(registry.coordination?.requireHumanReviewBeforeProtectedIntegration===true,'human review boundary missing');
  assert(['15m','30m','1h'].includes(registry.activationGate?.testDuration),'live test duration must be bounded');
  assert(JSON.stringify(registry.activationGate?.parallelWorkers||[])===JSON.stringify(['director-builder','timeline-builder']),'parallel activation must name exactly Director and Timeline specialists');
  assert((registry.activationGate?.allowedTestDurations||[]).every(d=>['15m','30m','1h'].includes(d)),'activation duration list contains an unapproved duration');
}
assert(registry.coordination?.coordinator===coordinatorPath,'registry coordinator path mismatch');
assert(registry.coordination?.failureQueue==='builder/working/autobot-failure-queue.jsonl','failure queue path mismatch');
assert(registry.coordination?.specialistHandoffContract===specialistHandoffPath,'specialist handoff contract path mismatch');
assert(registry.coordination?.specialistHandoffVerifier===specialistHandoffVerifierPath,'specialist handoff verifier path mismatch');
const builder=registry.bots.find(b=>b.id==='builder');
assert(builder?.entrypoint==='builder/runner/aider-feature-brain.mjs'&&builder.status==='proven'&&builder.protected===true,'protected proven Builder contract changed');
const specialists=registry.bots.filter(b=>b.specialistBuilder===true);
assert(specialists.length===2,'exactly two specialist Builders are authorised by the current live gate');
const scopes={director-builder:['src/director.js','src/aiEditPlanner.js'],timeline-builder:['src/executableTimeline.js','src/editorialRhythm.js','src/renderer.js']};
for(const bot of specialists){assert(bot.entrypoint===specialistPath&&bot.status==='verified'&&bot.protected===false,`specialist registry contract invalid: ${bot.id}`);assert(JSON.stringify(bot.ownsFiles)===JSON.stringify(scopes[bot.id]),`specialist scope invalid: ${bot.id}`);for(const file of bot.ownsFiles)assert(fs.existsSync(path.join(root,file)),`specialist scope file missing: ${file}`);}
has(specialist,/AUTOBOT_SPECIALIST_BOT_ID/,'specialist id contract missing');
has(specialist,/AUTOBOT_SPECIALIST_OBJECTIVE/,'specialist objective contract missing');
has(specialist,/AUTOBOT_SPECIALIST_BUILDER_ENABLED/,'specialist activation flag missing');
has(specialist,/registry\.enabled\s*!==\s*true\s*\|\|\s*registry\.coordination\?\.mode\s*!==\s*['"]active['"]/,'specialist must refuse inactive fleet');
has(specialist,/writeSpecialistHandoff\(/,'specialist handoff producer missing');
has(specialist,/status\s*:\s*['"]verified-candidate['"]/,'specialist verified-candidate handoff missing');
has(specialist,/npm.*install.*no-audit.*no-fund.*no-package-lock/,'specialist isolated dependency install missing');
has(coordinator,/specialistBotId/,'coordinator specialist discovery missing');
has(coordinator,/specialistObjective/,'coordinator specialist objective missing');
has(coordinator,/specialist-builder-required/,'coordinator specialist decision missing');
for(const text of [repair,qa,reviewer])has(text,/no-audit.*no-fund.*no-package-lock/,'recovery worker isolated dependency install missing');
assert(pkg.scripts?.['verify:autobot-fleet-foundation']==='node scripts/autobot/verify-autobot-fleet-foundation.mjs','fleet foundation package contract missing');
assert(pkg.scripts?.['verify:autobot-specialist-builder']==='node scripts/autobot/verify-autobot-specialist-builder.mjs','specialist verifier package contract missing');
assert(pkg.scripts?.['verify:autobot-specialist-handoff']==='node scripts/autobot/verify-autobot-specialist-handoff.mjs','handoff verifier package contract missing');
has(validation,/workflow_dispatch/,'foundation validation workflow must be manually runnable');
has(validation,/verify:autobot-fleet-foundation/,'foundation validation workflow must invoke the fleet verifier');
has(validation,/autobot-coordinator\.mjs/,'foundation validation workflow must exercise the plan-only coordinator');
for(const forbidden of [repairPath,qaPath,reviewerPath,selfImprovementPath,specialistPath])assert(!workflow.includes(forbidden),`production workflow must not activate ${forbidden}`);
assert(handoff.includes('AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT'),'specialist handoff must expose the Reviewer contract');
for(const file of [coordinatorPath,queuePath,repairPath,qaPath,reviewerPath,specialistPath,specialistHandoffPath,specialistVerifierPath,specialistHandoffVerifierPath])execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,enabled:registry.enabled,mode:registry.coordination.mode,testDuration:registry.activationGate?.testDuration,maxConcurrentWorkers:registry.coordination.maxConcurrentWorkers,specialists:specialists.map(b=>b.id)}));
