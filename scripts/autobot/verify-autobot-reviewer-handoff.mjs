#!/usr/bin/env node
/** Verify the Coordinator -> Reviewer commit handoff contract without activation. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const coordinatorPath='builder/runner/autobot-coordinator.mjs';
const reviewerPath='builder/runner/autobot-reviewer.mjs';
const registryPath='builder/brain/autobot-fleet.json';
const coordinator=fs.readFileSync(path.join(root,coordinatorPath),'utf8');
const reviewer=fs.readFileSync(path.join(root,reviewerPath),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryPath),'utf8'));
function assert(condition,message){if(!condition)throw new Error(message);}

assert(coordinator.includes("const reviewBaseCommit=String(process.env.AUTOBOT_REVIEW_BASE_COMMIT||'').trim();"),'Coordinator must read AUTOBOT_REVIEW_BASE_COMMIT exactly.');
assert(coordinator.includes("const reviewCommit=String(process.env.AUTOBOT_REVIEW_COMMIT||'').trim();"),'Coordinator must read AUTOBOT_REVIEW_COMMIT exactly.');
assert(coordinator.includes('function validCommit(value){return /^[0-9a-f]{40}$/i.test(value);}'),'Coordinator must validate both review commits as full hexadecimal SHAs.');
assert(coordinator.includes('validCommit(reviewBaseCommit)&&validCommit(reviewCommit)'),'Reviewer routing must require both validated commits.');
assert(coordinator.includes("decision('reviewer-required'"),'Coordinator must expose a reviewer-required decision.');
assert(coordinator.includes('baseCommit:reviewBaseCommit,candidateCommit:reviewCommit'),'Coordinator must hand both commits into the reviewer decision.');
assert(coordinator.includes('reviewCandidate:{baseCommit:validCommit(reviewBaseCommit)?reviewBaseCommit:null,candidateCommit:validCommit(reviewCommit)?reviewCommit:null'),'Coordinator plan must persist the validated review-candidate evidence.');
assert(!coordinator.includes('state.lastRunCommit'),'Coordinator must not depend on the removed undocumented state.lastRunCommit field.');
assert(reviewer.includes('AUTOBOT_REVIEW_BASE_COMMIT'),'Reviewer must consume the exact base-commit environment contract.');
assert(reviewer.includes('AUTOBOT_REVIEW_COMMIT'),'Reviewer must consume the exact candidate-commit environment contract.');
assert(reviewer.includes("git(['diff','--name-only',`${base}..${candidate}`])"),'Reviewer must inspect the exact base-to-candidate diff.');
const reviewerBot=registry.bots.find(bot=>bot.id==='reviewer');
assert(reviewerBot?.entrypoint===reviewerPath,'Registry Reviewer entrypoint must exactly match the implementation path.');
assert(reviewerBot?.status==='verified','Reviewer must remain registry-marked verified.');
assert(reviewerBot?.protected===false,'Reviewer must remain unprotected.');
console.log(JSON.stringify({ok:true,contract:'AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT',coordinator:coordinatorPath,reviewer:reviewerPath,activationBlocked:registry.enabled!==true||registry.coordination?.mode!=='active'}));
