#!/usr/bin/env node
/**
 * AutoBot QA Bot — independent verifier for isolated Repair Bot handoffs.
 *
 * QA consumes one REPAIRED failure, verifies the recorded repair branch/commit
 * against its recorded base, reconstructs the exact patch in a fresh worktree,
 * runs build and product-quality verification there, and only then records
 * VERIFIED. It never edits the protected checkout, merges, pushes, or changes
 * validators to make a repair pass.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFailures, transitionFailure } from './autobot-failure-queue.mjs';

const root=process.cwd();
const queuePath=process.env.AUTOBOT_FAILURE_QUEUE_PATH||path.join(root,'builder','working','autobot-failure-queue.jsonl');
const qaRoot=process.env.AUTOBOT_QA_WORKTREE_ROOT||path.join(os.tmpdir(),'bikeztagram-autobot-qa');
const timeoutMs=Math.max(30_000,Number.parseInt(process.env.AUTOBOT_QA_TIMEOUT_MS||String(20*60*1000),10));

function git(args,cwd=root){return execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
function fail(message){throw new Error(message);}
function selectRepair(id){
  const repaired=readFailures({status:'repaired'});
  return id?repaired.find(record=>record.id===id)||null:repaired[0]||null;
}
function validateHandoff(record){
  if(!record)fail('no REPAIRED failure is available for QA');
  if(!record.repairBranch||!record.repairBaseCommit||!record.repairCommit)fail(`failure ${record.id} has incomplete repair handoff metadata`);
  if(!Array.isArray(record.files)||!record.files.length)fail(`failure ${record.id} has no declared repair files`);
  if(!/^[0-9a-f]{7,64}$/i.test(record.repairBaseCommit)||!/^[0-9a-f]{7,64}$/i.test(record.repairCommit))fail(`failure ${record.id} has invalid repair commit metadata`);
  return record;
}
function worktreeFor(id){return path.join(qaRoot,id);}
function cleanup(worktree){try{git(['worktree','remove','--force',worktree]);}catch{}}
function runQA(record){
  validateHandoff(record);
  const worktree=worktreeFor(record.id);
  cleanup(worktree);
  fs.mkdirSync(qaRoot,{recursive:true});
  try{
    const base=git(['rev-parse',record.repairBaseCommit]);
    const commit=git(['rev-parse',record.repairCommit]);
    const branchCommit=git(['rev-parse',record.repairBranch]);
    if(commit!==branchCommit)fail(`repair branch ${record.repairBranch} does not point to recorded repair commit`);
    if(!git(['merge-base','--is-ancestor',base,commit]))fail('recorded repair base is not an ancestor of the repair commit');
    const parents=git(['rev-list','--parents','-n','1',commit]).split(/\s+/).slice(1);
    if(parents.length!==1||parents[0]!==base)fail('repair commit must be exactly one focused commit on the recorded base');
    const changed=git(['diff','--name-only',`${base}..${commit}`]).split(/\r?\n/).filter(Boolean);
    const unauthorized=changed.filter(file=>!record.files.includes(file));
    if(unauthorized.length)fail(`repair commit changed files outside failure scope: ${unauthorized.join(', ')}`);
    if(!changed.length)fail('repair commit contains no file changes');
    git(['worktree','add','--detach',worktree,base]);
    const patch=git(['diff','--binary',`${base}..${commit}`]);
    if(!patch)fail('repair commit has no reconstructable patch');
    execFileSync('git',['apply','--whitespace=nowarn'],{cwd:worktree,input:patch,encoding:'utf8',stdio:['pipe','inherit','inherit']});
    const qaChanged=git(['status','--short'],worktree).split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);
    const qaUnauthorized=qaChanged.filter(file=>!record.files.includes(file));
    if(qaUnauthorized.length)fail(`QA reconstruction changed files outside failure scope: ${qaUnauthorized.join(', ')}`);
    const diffCheck=spawnSync('git',['diff','--check'],{cwd:worktree,encoding:'utf8',stdio:'inherit'});
    if(diffCheck.error||diffCheck.status!==0)fail('QA reconstructed patch failed git diff --check');
    const build=spawnSync('npm',['run','build'],{cwd:worktree,encoding:'utf8',stdio:'inherit',timeout:Math.min(120_000,timeoutMs)});
    if(build.error||build.status!==0)fail(`QA build failed with ${build.status??'error'}`);
    const quality=spawnSync('npm',['run','verify:autobot-product-change-quality'],{cwd:worktree,encoding:'utf8',stdio:'inherit',timeout:Math.min(120_000,timeoutMs)});
    if(quality.error||quality.status!==0)fail(`QA product-quality verification failed with ${quality.status??'error'}`);
    transitionFailure(record.id,'verified',{transitionedBy:'autobot-qa',repairBranch:record.repairBranch,repairBaseCommit:base,repairCommit:commit,resolution:'independent QA reconstructed the repair from its recorded base and passed diff, build and product-quality verification.'});
    return {ok:true,failureId:record.id,baseCommit:base,repairCommit:commit,changedFiles:changed};
  }catch(error){
    try{transitionFailure(record.id,'rejected',{transitionedBy:'autobot-qa',repairBranch:record.repairBranch,repairBaseCommit:record.repairBaseCommit,repairCommit:record.repairCommit,resolution:error.message});}catch(transitionError){console.error(`[qa] failed to record REJECTED state: ${transitionError.message}`);}
    throw error;
  }finally{cleanup(worktree);}
}

export function qaOne({failureId=null}={}){
  const record=selectRepair(failureId);
  if(!record)return {ok:true,status:'no-repaired-failure'};
  return runQA(record);
}

if(import.meta.url===`file://${process.argv[1]}`){
  const command=process.argv[2]||'qa';
  const failureId=process.argv[3]||null;
  if(command==='qa')console.log(JSON.stringify(qaOne({failureId}),null,2));
  else throw new Error(`unknown command: ${command}`);
}
