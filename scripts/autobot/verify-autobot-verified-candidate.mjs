#!/usr/bin/env node
/**
 * Verify and materialise the Repair -> QA -> Reviewer integration handoff.
 *
 * This is an eligibility gate, not an integration worker. It accepts only a
 * recovery state that proves the exact same repair commit passed QA and
 * adversarial review, then writes a durable manifest. It never pushes, merges,
 * edits product code, or changes protected integration settings.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const statePath=path.join(root,'builder','working','autobot-fleet-recovery.json');
const reviewPath=path.join(root,'builder','working','autobot-review.json');
const outputPath=path.join(root,'builder','working','autobot-verified-candidate.json');
const validCommit=value=>/^[0-9a-f]{40}$/i.test(String(value||''));
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const fail=message=>{throw new Error(message)};

if(!fs.existsSync(statePath))fail('No durable fleet recovery state exists.');
if(!fs.existsSync(reviewPath))fail('No durable adversarial review exists.');
const state=readJson(statePath);
const review=readJson(reviewPath);

if(state.status!=='verified-candidate')fail(`Integration eligibility requires recovery status verified-candidate; received ${state.status||'missing'}.`);
if(state.protectedIntegration!==false)fail('Protected integration boundary is not explicitly closed.');
if(!state.failureId)fail('Verified candidate is missing failureId.');
if(!state.repair?.baseCommit||!state.repair?.commit)fail('Verified candidate is missing Repair Bot commit evidence.');
if(!state.qa?.baseCommit||!state.qa?.repairCommit)fail('Verified candidate is missing QA commit evidence.');
if(state.qa.baseCommit!==state.repair.baseCommit)fail('QA base commit does not match Repair Bot base commit.');
if(state.qa.repairCommit!==state.repair.commit)fail('QA repair commit does not match Repair Bot repair commit.');
if(review.status!=='pass')fail(`Adversarial review is not pass: ${review.status||'missing'}.`);
if(review.baseCommit!==state.qa.baseCommit)fail('Reviewer base commit does not match QA base commit.');
if(review.candidateCommit!==state.qa.repairCommit)fail('Reviewer candidate commit does not match QA repair commit.');
if(!review.buildVerified)fail('Reviewer did not verify a build.');
if(!Array.isArray(review.findings)||review.findings.some(item=>item.severity==='critical'||item.severity==='high'))fail('Reviewer contains blocking findings.');
if(!Array.isArray(review.changedFiles)||!review.changedFiles.length)fail('Verified candidate contains no changed files.');
if(!Array.isArray(review.productFiles))fail('Reviewer product file inventory is missing.');

const head=git(['rev-parse','HEAD']);
if(head!==state.repair.commit && head!==state.qa.repairCommit)console.log(`[autobot] note: eligibility is based on the recorded isolated repair commit ${state.qa.repairCommit}; current checkout is ${head}.`);
const manifest={
  schemaVersion:1,
  status:'integration-eligible',
  failureId:state.failureId,
  baseCommit:state.qa.baseCommit,
  candidateCommit:state.qa.repairCommit,
  changedFiles:review.changedFiles,
  productFiles:review.productFiles,
  gates:{repair:true,qa:true,reviewer:true,buildVerified:true,protectedIntegration:false},
  automaticPush:false,
  automaticMerge:false,
  integrationAction:'operator-controlled pull-request integration only',
  generatedAt:new Date().toISOString()
};
fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
