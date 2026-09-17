#!/usr/bin/env node
/** Verify the AutoBot fleet foundation and registered discovery contracts. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const paths={registry:'builder/brain/autobot-fleet.json', package:'package.json',workflow:'.github/workflows/autonomous-builder-v2-fast.yml',validation:'.github/workflows/autobot-fleet-foundation-validation.yml',documentation:'builder/brain/autobot-fleet-foundation.md',coordinator:'builder/runner/autobot-coordinator.mjs',queue:'builder/runner/autobot-failure-queue.mjs',repair:'builder/runner/autobot-repair.mjs',qa:'builder/runner/autobot-qa.mjs',reviewer:'builder/runner/autobot-reviewer.mjs',reviewerVerifier:'scripts/autobot/verify-autobot-reviewer.mjs',reviewerHandoffVerifier:'scripts/autobot/verify-autobot-reviewer-handoff.mjs',specialist:'builder/runner/autobot-specialist-builder.mjs',specialistVerifier:'scripts/autobot/verify-autobot-specialist-builder.mjs',specialistHandoff:'builder/runner/autobot-specialist-handoff.mjs',specialistHandoffVerifier:'scripts/autobot/verify-autobot-specialist-handoff.mjs',selfImprovement:'builder/runner/autobot-self-improvement.mjs',selfImprovementVerifier:'scripts/autobot/verify-autobot-self-improvement.mjs',repairVerifier:'scripts/autobot/verify-autobot-repair-bot.mjs',qaVerifier:'scripts/autobot/verify-autobot-qa.mjs'};
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const has=(text,pattern,message)=>assert(pattern.test(text),message);
const registry=JSON.parse(read(paths.registry));
const pkg=JSON.parse(read(paths.package));
const workflow=read(paths.workflow), validation=read(paths.validation), doc=read(paths.documentation);
const coordinator=read(paths.coordinator), queue=read(paths.queue), repair=read(paths.repair), qa=read(paths.qa), reviewer=read(paths.reviewer), specialist=read(paths.specialist), handoff=read(paths.specialistHandoff);
assert(registry.schemaVersion===1,'fleet registry schema must be v1');
const live=registry.enabled===true&&registry.coordination?.mode==='active';
const foundation=registry.enabled===false&&registry.coordination?.mode==='plan-only';
assert(live||foundation,'fleet must be active under an explicit live-test gate or disabled/plan-only');
assert(Number.isInteger(registry.coordination?.maxConcurrentWorkers)&&registry.coordination.maxConcurrentWorkers>=1&&registry.coordination.maxConcurrentWorkers<=2,'fleet worker limit must remain bounded at two');
if(live){
 assert(registry.activationGate?.requiredEnabled===true&&registry.activationGate?.requiredMode==='active','live activation contract changed');
 assert(registry.activationGate?.protectedIntegration===false,'protected integration must remain disabled');
 assert(registry.coordination?.requireIsolatedWorker===true,'isolated worker requirement missing');
 assert(registry.coordination?.requireVerificationBeforeHandoff===true,'verification-before-handoff requirement missing');
 assert(registry.coordination?.requireHumanReviewBeforeProtectedIntegration===true,'human review boundary missing');
 const approved=['15m','30m','1h','4h','5h'];
 assert(approved.includes(registry.activationGate?.testDuration),'live test duration must be bounded to an approved window');
 assert(JSON.stringify(registry.activationGate?.parallelWorkers||[])===JSON.stringify(['director-builder','timeline-builder']),'parallel activation must name exactly Director and Timeline specialists');
 assert((registry.activationGate?.allowedTestDurations||[]).every(d=>approved.includes(d)),'activation duration list contains an unapproved duration');
 assert((registry.activationGate?.allowedTestDurations||[]).includes('5h'),'five-hour overnight activation must be explicitly registered');
}
const c=registry.coordination;
assert(c?.coordinator===paths.coordinator&&c?.failureQueue==='builder/working/autobot-failure-queue.jsonl'&&c?.sharedEvidence==='builder/working/autobot-fleet-plan.json','core registry paths changed');
assert(c?.specialistHandoff==='builder/working/autobot-specialist-handoff.json'&&c?.specialistHandoffContract===paths.specialistHandoff&&c?.specialistHandoffVerifier===paths.specialistHandoffVerifier,'specialist handoff registry paths changed');
const builder=registry.bots.find(b=>b.id==='builder');
assert(builder?.entrypoint==='builder/runner/aider-feature-brain.mjs'&&builder.status==='proven'&&builder.protected===true,'protected proven Builder contract changed');
for(const bot of registry.bots){assert(bot.id&&bot.role&&bot.entrypoint&&bot.status,`registry bot metadata incomplete: ${bot.id||'unknown'}`);if(bot.id!=='builder')assert(bot.protected===false,`non-protected bot unexpectedly protected: ${bot.id}`);if(bot.status==='planned')assert(String(bot.entrypoint).startsWith('future:'),`planned bot must use future: entrypoint: ${bot.id}`);}
for(const [id,entrypoint] of [['repair',paths.repair],['qa',paths.qa],['reviewer',paths.reviewer],['self-improvement',paths.selfImprovement]]){const bot=registry.bots.find(b=>b.id===id);assert(bot?.entrypoint===entrypoint&&bot.status==='verified',`${id} registry contract must match its verified implementation`);assert(fs.existsSync(path.join(root,entrypoint)),`${id} implementation missing: ${entrypoint}`);}
const specialists=registry.bots.filter(b=>b.specialistBuilder===true);
assert(specialists.length===2,'exactly two specialist Builders are authorised by the current live gate');
const scopes={'director-builder':['src/director.js'],'timeline-builder':['src/executableTimeline.js','src/editorialRhythm.js','src/renderer.js']};
for(const bot of specialists){assert(bot.entrypoint===paths.specialist&&bot.status==='verified'&&bot.protected===false,`specialist registry contract invalid: ${bot.id}`);assert(JSON.stringify(bot.ownsFiles)===JSON.stringify(scopes[bot.id]),`specialist scope invalid: ${bot.id}`);for(const file of bot.ownsFiles){assert(!path.isAbsolute(file)&&!file.includes('..')&&!file.startsWith('.')&&!file.includes('\\'),`unsafe specialist scope: ${bot.id}:${file}`);assert(fs.existsSync(path.join(root,file)),`specialist scope file missing: ${file}`);}}
has(specialist,/AUTOBOT_SPECIALIST_BOT_ID/,'specialist id contract missing');has(specialist,/AUTOBOT_SPECIALIST_OBJECTIVE/,'specialist objective contract missing');has(specialist,/AUTOBOT_SPECIALIST_BUILDER_ENABLED/,'specialist activation flag missing');has(specialist,/bot\.specialistBuilder/,'specialist registry-role guard missing');has(specialist,/ownsFiles/,'specialist registry scope guard missing');has(specialist,/candidateCommit/,'specialist candidate handoff wiring missing');has(specialist,/writeSpecialistHandoff\(/,'specialist handoff producer missing');has(specialist,/status\s*:\s*['"]verified-candidate['"]/,'verified candidate handoff missing');has(specialist,/AUTOBOT_FEATURE_PASSES/,'specialist feature-pass budget missing');has(specialist,/AUTOBOT_FEATURE_DEADLINE_EPOCH_MS/,'specialist verification deadline missing');has(specialist,/no-auto-commits/,'Aider auto-commits must remain disabled');has(specialist,/no-dirty-commits/,'Aider dirty commits must remain disabled');has(specialist,/Do not merge or push/,'specialist must not merge or push');
has(coordinator,/specialistBotId/,'coordinator specialist discovery missing');has(coordinator,/specialistObjective/,'coordinator specialist objective missing');has(coordinator,/specialist-builder-required/,'coordinator specialist decision missing');
for(const text of [repair,qa,reviewer])has(text,/no-audit.*no-fund.*no-package-lock/,'recovery worker isolated dependency install missing');
assert(handoff.includes('AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT'),'specialist handoff must expose Reviewer commit contract');
const scripts=pkg.scripts||{};
for(const [name,expected] of Object.entries({'verify:autobot-fleet-foundation':'node scripts/autobot/verify-autobot-fleet-foundation.mjs','verify:autobot-repair-bot':`node ${paths.repairVerifier}`,'verify:autobot-qa':`node ${paths.qaVerifier}`,'verify:autobot-reviewer':`node ${paths.reviewerVerifier}`,'verify:autobot-reviewer-handoff':`node ${paths.reviewerHandoffVerifier}`,'verify:autobot-specialist-builder':`node ${paths.specialistVerifier}`,'verify:autobot-specialist-handoff':`node ${paths.specialistHandoffVerifier}`,'verify:autobot-self-improvement':`node ${paths.selfImprovementVerifier}`}))assert(scripts[name]===expected,`${name} package discoverability contract is wrong`);
assert(doc.includes('Specialist Builder Fleet')&&doc.includes('Director Builder')&&doc.includes('Timeline Builder'),'foundation documentation must describe specialist Builders');
assert(validation.includes('workflow_dispatch')&&validation.includes('npm run verify:autobot-fleet-foundation'),'foundation validation workflow contract missing');
for(const forbidden of [paths.coordinator,paths.repair,paths.qa,paths.reviewer,paths.selfImprovement,paths.specialist])assert(!workflow.includes(forbidden),`production workflow must not directly activate ${forbidden}`);
for(const file of [paths.coordinator,paths.queue,paths.repair,paths.qa,paths.reviewer,paths.reviewerVerifier,paths.reviewerHandoffVerifier,paths.specialist,paths.specialistVerifier,paths.specialistHandoff,paths.specialistHandoffVerifier,paths.selfImprovement,paths.selfImprovementVerifier,paths.repairVerifier,paths.qaVerifier])execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,enabled:registry.enabled,mode:registry.coordination.mode,testDuration:registry.activationGate?.testDuration,maxConcurrentWorkers:registry.coordination.maxConcurrentWorkers,specialists:specialists.map(b=>b.id),protectedIntegration:registry.activationGate?.protectedIntegration===false}));
