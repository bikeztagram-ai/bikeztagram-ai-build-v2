#!/usr/bin/env node
/**
 * Recover one repairable Specialist Builder failure.
 *
 * The failed specialist patch is restored onto its exact base in a detached
 * recovery checkout, then the existing Repair -> QA -> Reviewer chain handles
 * it. No main merge or push is performed here.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { appendFailure } from './autobot-failure-queue.mjs';

const root=process.cwd();
const input=process.argv[2];
if(!input)throw new Error('specialist recovery requires a specialist result directory');
const outcomePath=path.join(input,'autobot-specialist-outcome.json');
const patchPath=path.join(input,'autobot-specialist-failure.patch');
if(!fs.existsSync(outcomePath))throw new Error(`missing specialist outcome: ${outcomePath}`);
const outcome=JSON.parse(fs.readFileSync(outcomePath,'utf8'));
if(outcome.status!=='failure')throw new Error(`specialist outcome is not a failure: ${outcome.status}`);
if(outcome.repairable!==true||outcome.category!=='product-change')throw new Error(`specialist failure is not classified as a repairable product failure: ${outcome.category}`);
if(!fs.existsSync(patchPath))throw new Error('repairable specialist failure has no captured candidate patch');
if(!/^[0-9a-f]{40}$/i.test(String(outcome.baseCommit||'')))throw new Error('repairable specialist failure has no exact base commit');

const recoveryRoot=fs.mkdtempSync(path.join(os.tmpdir(),`bikeztagram-specialist-recovery-${outcome.botId}-`));
const branch=`autobot-specialist-recovery/${outcome.botId}-${Date.now()}`;
function git(args,cwd=recoveryRoot){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
function run(args,cwd=recoveryRoot){execFileSync('git',args,{cwd,stdio:'inherit'});}
function npmRun(){execFileSync('npm',['--version'],{cwd:recoveryRoot,stdio:'ignore'});}
function cleanup(){try{execFileSync('git',['worktree','remove','--force',recoveryRoot],{cwd:process.cwd(),stdio:'ignore'});}catch{} }

try{
  const base=outcome.baseCommit;
  execFileSync('git',['worktree','add','--detach',recoveryRoot,base],{cwd:root,stdio:'inherit'});
  const patch=fs.readFileSync(patchPath,'utf8');
  if(!patch.trim())throw new Error('captured specialist failure patch is empty');
  fs.writeFileSync(path.join(recoveryRoot,'.autobot-specialist-recovery.patch'),patch);
  run(['apply','--check','.autobot-specialist-recovery.patch']);
  run(['apply','--whitespace=nowarn','.autobot-specialist-recovery.patch']);
  run(['diff','--check']);
  run(['checkout','-b',branch]);
  const files=Array.isArray(outcome.files)?[...new Set(outcome.files.filter(Boolean))]:[];
  if(!files.length)throw new Error('repairable specialist failure has no file scope');
  const changed=git(['diff','--name-only']).split(/\r?\n/).filter(Boolean);
  if(changed.some(file=>!files.includes(file)))throw new Error(`restored specialist patch escaped declared scope: ${changed.filter(file=>!files.includes(file)).join(', ')}`);
  run(['add','--',...files]);
  run(['commit','-m',`chore(autobot): restore failed ${outcome.botId} candidate`]);
  const restoredCommit=git(['rev-parse','HEAD']);

  const queueRecord=appendFailure({
    source:'autobot-specialist-builder',
    runId:process.env.GITHUB_RUN_ID||'local',
    objectiveId:`specialist:${outcome.botId}`,
    taskId:`specialist:${outcome.botId}`,
    stage:'specialist-builder',
    error:outcome.error,
    expected:`Specialist objective completes with build and product-quality verification: ${outcome.objective}`,
    actual:outcome.error,
    files,
    evidence:outcome.evidence||[],
    attempted:[`Specialist ${outcome.botId} execution`],
    retryable:true,
    repairHint:`Repair the failed ${outcome.botId} candidate from restored commit ${restoredCommit}.`,
    metadata:{specialistBotId:outcome.botId,objective:outcome.objective,specialistBaseCommit:base,restoredCandidateCommit:restoredCommit}
  });

  const registry=JSON.parse(fs.readFileSync(path.join(recoveryRoot,'builder/brain/autobot-fleet.json'),'utf8'));
  if(registry.enabled!==true||registry.coordination?.mode!=='active')throw new Error('fleet recovery gate is not active');
  const recoveryPath=registry.coordination?.recoveryRunner;
  if(recoveryPath!=='builder/runner/autobot-fleet-recovery.mjs')throw new Error('registry recovery runner does not match the controlled recovery implementation');
  const {recoverFleet}=await import(pathToFileURL(path.join(recoveryRoot,recoveryPath)).href);
  const result=await recoverFleet({failureId:queueRecord.id});
  console.log(JSON.stringify({ok:result?.ok===true,failureId:queueRecord.id,botId:outcome.botId,restoredBase:base,restoredCandidate:restoredCommit,recovery:result},null,2));
  if(result?.ok!==true)process.exitCode=3;
}finally{cleanup();}
