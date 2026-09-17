#!/usr/bin/env node
/** Verify the durable Specialist Builder -> Reviewer/QA handoff contract. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const runnerPath='builder/runner/autobot-specialist-builder.mjs';
const handoffPath='builder/runner/autobot-specialist-handoff.mjs';
const registryPath='builder/brain/autobot-fleet.json';
const runner=fs.readFileSync(path.join(root,runnerPath),'utf8');
const handoff=fs.readFileSync(path.join(root,handoffPath),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryPath),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const suite=fs.readFileSync(path.join(root,'scripts/verify-main-suite.mjs'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}
function has(text,pattern,message){assert(pattern.test(text),message);}
assert(runner.includes('./autobot-specialist-handoff.mjs'),'Specialist Builder must use the authoritative handoff module.');
has(runner,/writeSpecialistHandoff\(/,'Specialist Builder must write the durable handoff.');
has(runner,/status\s*:\s*['"]verified-candidate['"]/,'Specialist Builder must label verified candidates.');
has(runner,/reviewContract\s*:\s*['"]AUTOBOT_REVIEW_BASE_COMMIT \+ AUTOBOT_REVIEW_COMMIT['"]/,'Specialist Builder must publish the exact Reviewer contract.');
assert(handoff.includes("SPECIALIST_HANDOFF_SCHEMA='autobot-specialist-handoff-v1'"),'Handoff schema must remain v1.');
assert(handoff.includes('baseCommit')&&handoff.includes('candidateCommit')&&handoff.includes('branch'),'Handoff must carry base/candidate commit and branch identity.');
assert(handoff.includes('ownsFiles')&&handoff.includes('productQualityCheck'),'Handoff must carry scope and verification evidence.');
assert(handoff.includes('AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT'),'Handoff must expose the Reviewer contract.');
assert(handoff.includes('validateSpecialistHandoff'),'Handoff must validate before writing and reading.');
assert(registry.coordination?.sharedEvidence==='builder/working/autobot-fleet-plan.json','Registry shared evidence path must remain authoritative.');
assert(pkg.scripts?.['verify:autobot-specialist-handoff']==='node scripts/autobot/verify-autobot-specialist-handoff.mjs','Package verifier contract is wrong.');
assert(suite.includes("'verify:autobot-specialist-handoff'"),'Main verification suite must discover the handoff verifier.');
for(const file of [runnerPath,handoffPath])execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,schema:'autobot-specialist-handoff-v1',downstreamReviewerContract:'AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT'}));
