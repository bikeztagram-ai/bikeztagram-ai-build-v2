#!/usr/bin/env node
/**
 * Verified-candidate handoff gate.
 *
 * Converts a successful Repair -> QA -> Reviewer result into an explicit,
 * auditable integration-eligible manifest. It does NOT push, merge, or modify
 * protected integration. A candidate is eligible only when every preceding
 * gate agrees on the same repair commit and the reviewer explicitly passed.
 */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const statePath=path.join(root,'builder','working','autobot-fleet-recovery.json');
const reviewPath=process.env.AUTOBOT_REVIEW_OUTPUT||path.join(root,'builder','working','autobot-review.json');
const output=process.env.AUTOBOT_HANDOFF_OUTPUT||path.join(root,'builder','working','autobot-verified-candidate.json');
const sha=/^[0-9a-f]{40}$/i;
function read(file){if(!fs.existsSync(file))throw new Error(`required handoff evidence is missing: ${file}`);return JSON.parse(fs.readFileSync(file,'utf8'));}
function fail(message){throw new Error(message);}
const state=read(statePath);
const review=read(reviewPath);
if(state.status!=='verified-candidate')fail(`candidate is not verified: recovery status is ${state.status||'missing'}`);
if(state.protectedIntegration!==false)fail('protected integration must remain false during candidate handoff');
if(state.review?.status!=='pass')fail(`review gate did not pass: ${state.review?.status||'missing'}`);
if(state.qa?.ok!==true)fail('QA gate did not report ok=true');
const base=state.qa?.baseCommit;
const repair=state.qa?.repairCommit;
if(!sha.test(base)||!sha.test(repair))fail('QA handoff must contain full baseCommit and repairCommit SHAs');
if(review.status!=='pass')fail(`review evidence does not independently report pass: ${review.status||'missing'}`);
if(review.baseCommit!==base)fail('review baseCommit does not match QA baseCommit');
if(review.candidateCommit!==repair)fail('review candidateCommit does not match QA repairCommit');
if(state.repair?.commit!==repair)fail('recovery repair commit does not match QA repairCommit');
if(!Array.isArray(review.changedFiles)||review.changedFiles.length===0)fail('review evidence contains no changed files');
if(review.automaticMerge!==false||review.automaticPush!==false)fail('review evidence must explicitly prohibit automatic merge and push');
const manifest={
  schemaVersion:1,
  status:'integration-eligible',
  eligible:true,
  source:'autobot-fleet-controlled-recovery',
  failureId:state.failureId,
  baseCommit:base,
  candidateCommit:repair,
  cycleBaseCommit:process.env.AUTOBOT_CYCLE_BASE_COMMIT||base,
  changedFiles:review.changedFiles,
  productFiles:review.productFiles||[],
  gates:{builderCandidatePreserved:true,repair:true,qa:true,review:true},
  protectedIntegration:false,
  automaticMerge:false,
  automaticPush:false,
  generatedAt:new Date().toISOString(),
  integrationRule:'Only a separately authorized integration workflow may consume this manifest; merge remains blocked until all repository protection checks pass.'
};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
