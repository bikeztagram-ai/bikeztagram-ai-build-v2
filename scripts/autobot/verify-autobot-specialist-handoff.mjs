#!/usr/bin/env node
/** Verify the durable Specialist Builder -> Reviewer/QA handoff contract. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const runnerPath='builder/runner/autobot-specialist-builder.mjs';
const handoffPath='builder/runner/autobot-specialist-handoff.mjs';
const registryPath='builder/brain/autobot-fleet.json';
const packagePath='package.json';
const suitePath='scripts/verify-main-suite.mjs';
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function assert(condition,message){if(!condition)throw new Error(message);}
const runner=read(runnerPath); const handoff=read(handoffPath); const registry=JSON.parse(read(registryPath)); const pkg=JSON.parse(read(packagePath)); const suite=read(suitePath);
assert(runner.includes("./autobot-specialist-handoff.mjs"),'Specialist Builder must import the authoritative handoff module by exact relative path.');
assert(runner.includes('writeSpecialistHandoff({'),'Specialist Builder must write a durable handoff only after candidate verification/commit.');
assert(runner.includes("status:'verified-candidate'"),'Specialist Builder must label the durable candidate as verified-candidate.');
assert(runner.includes("reviewContract:'AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT'"),'Specialist Builder must publish the exact downstream Reviewer contract wording.');
assert(handoff.includes("SPECIALIST_HANDOFF_SCHEMA='autobot-specialist-handoff-v1'"),'Handoff schema name must be explicit and versioned.');
assert(handoff.includes('baseCommit')&&handoff.includes('candidateCommit')&&handoff.includes('branch'),'Handoff must carry explicit base/candidate commit and branch identity.');
assert(handoff.includes('ownsFiles')&&handoff.includes('productQualityCheck'),'Handoff must carry exact file scope and verification evidence.');
assert(handoff.includes('AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT'),'Handoff must expose the exact Reviewer discovery contract.');
assert(handoff.includes('validateSpecialistHandoff'),'Handoff must validate before writing and reading.');
assert(registry.coordination?.sharedEvidence==='builder/working/autobot-fleet-plan.json','Registry shared evidence path must remain authoritative for coordinator planning.');
const scripts=pkg.scripts||{};
assert(scripts['verify:autobot-specialist-handoff']==='node scripts/autobot/verify-autobot-specialist-handoff.mjs','package.json must expose the exact handoff verifier command.');
assert(suite.includes("'verify:autobot-specialist-handoff'"),'Main verification suite must discover the handoff verifier.');
for(const file of [runnerPath,handoffPath])execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,schema:'autobot-specialist-handoff-v1',runner:runnerPath,handoff:handoffPath,downstreamReviewerContract:'AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT'}));
