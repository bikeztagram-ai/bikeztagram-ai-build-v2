#!/usr/bin/env node
/**
 * Recover one repairable Specialist Builder failure.
 *
 * A failed specialist may already contain a real product candidate. Restore it
 * onto its exact base, prove it independently, and send that exact candidate
 * through QA -> Reviewer without asking Aider to rewrite valid work. Only an
 * unverified candidate goes through the normal Repair -> QA -> Reviewer chain.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const originalRoot=process.cwd();
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
function cleanup(){try{execFileSync('git',['worktree','remove','--force',recoveryRoot],{cwd:originalRoot,stdio:'ignore'});}catch{}}
function verifyCandidateTree(cwd){
  if(String(process.env.AUTOBOT_SKIP_NPM_INSTALL||'').toLowerCase()==='true'){
    const modules=path.join(originalRoot,'node_modules');
    if(!fs.existsSync(modules))return {ok:false,stage:'npm-install',error:'persistent root node_modules is missing'};
    if(!fs.existsSync(path.join(cwd,'node_modules')))fs.symlinkSync(modules,path.join(cwd,'node_modules'),'dir');
  }
  const install=String(process.env.AUTOBOT_SKIP_NPM_INSTALL||'').toLowerCase()==='true'?{error:null,status:0}:spawnSync('npm',['install','--no-audit','--no-fund','--no-package-lock'],{cwd,encoding:'utf8',stdio:'inherit',timeout:180_000});
  if(install.error||install.status!==0)return {ok:false,stage:'npm-install',error:String(install.error?.message||install.status)};
  const build=spawnSync('npm',['run','build'],{cwd,encoding:'utf8',stdio:'inherit',timeout:120_000});
  if(build.error||build.status!==0)return {ok:false,stage:'build',error:String(build.error?.message||build.status)};
  const quality=spawnSync('npm',['run','verify:autobot-product-change-quality'],{cwd,encoding:'utf8',stdio:'inherit',timeout:120_000});
  if(quality.error||quality.status!==0)return {ok:false,stage:'product-quality',error:String(quality.error?.message||quality.status)};
  return {ok:true,stage:'build-and-product-quality'};
}
function validCommit(value){return /^[0-9a-f]{40}$/i.test(String(value||''));}
async function runReviewer(root,entrypoint,baseCommit,candidateCommit){
  if(!validCommit(baseCommit)||!validCommit(candidateCommit))throw new Error('Reviewer handoff requires full base and candidate commit SHAs.');
  const output=path.join(root,'builder','working','autobot-review.json');
  const env={...process.env,AUTOBOT_REVIEW_BASE_COMMIT:baseCommit,AUTOBOT_REVIEW_COMMIT:candidateCommit,AUTOBOT_REVIEW_OUTPUT:output};
  try{execFileSync(process.execPath,[entrypoint],{cwd:root,env,stdio:'inherit'});return {status:'pass'};}
  catch(error){if(error.status===3)return {status:'needs-repair'};if(error.status===2)return {status:'reject'};throw error;}
}
async function routeVerifiedCandidate(recoveryRoot,registry,queueRecord,base,restoredCommit,restoredBranch,transitionFailure){
  const qaPath=registry.bots.find(item=>item.id==='qa')?.entrypoint;
  const reviewerPath=registry.bots.find(item=>item.id==='reviewer')?.entrypoint;
  if(!qaPath||!reviewerPath)throw new Error('registered QA/Reviewer entrypoints are required for direct verified-candidate recovery');
  const qaModule=await import(pathToFileURL(path.join(recoveryRoot,qaPath)).href);
  if(typeof qaModule.qaOne!=='function')throw new Error(`registered QA Bot '${qaPath}' does not export qaOne`);
  transitionFailure(queueRecord.id,'claimed',{transitionedBy:'autobot-specialist-recovery',repairBranch:restoredBranch,repairBaseCommit:base});
  transitionFailure(queueRecord.id,'repairing',{transitionedBy:'autobot-specialist-recovery',repairBranch:restoredBranch,repairBaseCommit:base,repairCommit:restoredCommit});
  transitionFailure(queueRecord.id,'repaired',{transitionedBy:'autobot-specialist-recovery',repairBranch:restoredBranch,repairBaseCommit:base,repairCommit:restoredCommit,resolution:'specialist candidate independently passed dirty-tree build/product-quality preflight; routed directly to QA without an Aider rewrite.'});
  const qa=qaModule.qaOne({failureId:queueRecord.id});
  if(!qa?.ok)throw new Error('QA Bot did not verify the preserved specialist candidate');
  const review=await runReviewer(recoveryRoot,reviewerPath,qa.baseCommit,qa.repairCommit);
  return {ok:review.status==='pass',status:review.status==='pass'?'verified-candidate':review.status==='needs-repair'?'review-needs-repair':'review-rejected',qa,review,protectedIntegration:false};
}

try{
  const base=outcome.baseCommit;
  execFileSync('git',['worktree','add','--detach',recoveryRoot,base],{cwd:originalRoot,stdio:'inherit'});
  process.chdir(recoveryRoot);
  run(['config','user.name','Bikeztagram AutoBot']);
  run(['config','user.email','autobot@bikeztagram.local']);

  // The failure queue module resolves its queue path at import time. Recovery
  // intentionally imports it only after changing into the isolated recovery
  // worktree and setting AUTOBOT_FAILURE_QUEUE_PATH, so the temporary recovery
  // queue and the verification/QA stages all operate on the same evidence file.
  process.env.AUTOBOT_FAILURE_QUEUE_PATH=path.join(recoveryRoot,'builder','working','autobot-failure-queue.jsonl');
  const {appendFailure,transitionFailure}=await import(pathToFileURL(path.join(recoveryRoot,'builder/runner/autobot-failure-queue.mjs')).href);

  const patch=fs.readFileSync(path.resolve(originalRoot,patchPath),'utf8');
  if(!patch.trim())throw new Error('captured specialist failure patch is empty');
  fs.writeFileSync('.autobot-specialist-recovery.patch',patch);
  run(['apply','--check','.autobot-specialist-recovery.patch']);
  run(['apply','--whitespace=nowarn','.autobot-specialist-recovery.patch']);
  run(['diff','--check']);
  run(['checkout','-b',branch]);
  const files=Array.isArray(outcome.files)?[...new Set(outcome.files.filter(Boolean))]:[];
  if(!files.length)throw new Error('repairable specialist failure has no file scope');
  const changed=git(['diff','--name-only']).split(/\r?\n/).filter(Boolean);
  if(changed.some(file=>!files.includes(file)))throw new Error(`restored specialist patch escaped declared scope: ${changed.filter(file=>!files.includes(file)).join(', ')}`);
  const queueRecord=appendFailure({
    source:'autobot-specialist-builder',runId:process.env.GITHUB_RUN_ID||'local',objectiveId:`specialist:${outcome.botId}`,taskId:`specialist:${outcome.botId}`,
    stage:'specialist-builder',error:outcome.error,
    expected:`Specialist objective completes with build and product-quality verification: ${outcome.objective}`,
    actual:outcome.error,files,evidence:outcome.evidence||[],attempted:[`Specialist ${outcome.botId} execution`],retryable:true,
    repairHint:`Repair the failed ${outcome.botId} candidate from restored commit ${restoredCommit}.`,
    metadata:{specialistBotId:outcome.botId,objective:outcome.objective,specialistBaseCommit:base,restoredCandidateCommit:restoredCommit,restoredRecoveryBranch:branch}
  });

  const preflight=verifyCandidateTree(recoveryRoot);
  const registry=JSON.parse(fs.readFileSync(path.join(recoveryRoot,'builder/brain/autobot-fleet.json'),'utf8'));
  if(registry.enabled!==true||registry.coordination?.mode!=='active')throw new Error('fleet recovery gate is not active');

  let result;
  let restoredCommit=null;
  if(preflight.ok){
    run(['add','--',...files]);
    run(['commit','-m',`chore(autobot): restore failed ${outcome.botId} candidate`]);
    restoredCommit=git(['rev-parse','HEAD']);
    console.log(`[autobot] specialist ${outcome.botId} candidate passed dirty-tree recovery preflight; routing exact candidate to QA without a rewrite`);
    result=await routeVerifiedCandidate(recoveryRoot,registry,queueRecord,base,restoredCommit,branch,transitionFailure);
  }else{
    const recoveryPath=registry.coordination?.recoveryRunner;
    if(recoveryPath!=='builder/runner/autobot-fleet-recovery.mjs')throw new Error('registry recovery runner does not match the controlled recovery implementation');
    const {recoverFleet}=await import(pathToFileURL(path.join(recoveryRoot,recoveryPath)).href);
    result=await recoverFleet({failureId:queueRecord.id});
  }

  if(result?.status==='verified-candidate'){
    const qaBase=result.qa?.baseCommit;
    const repairCommit=result.qa?.repairCommit;
    if(!validCommit(qaBase)||!validCommit(repairCommit))throw new Error('verified recovery result is missing exact QA commit pair');
    const patchOut=execFileSync('git',['diff','--binary',`${qaBase}..${repairCommit}`],{cwd:recoveryRoot,encoding:'utf8'});
    if(!patchOut.trim())throw new Error('verified repair candidate contains no patch');
    const workingDir=path.join(recoveryRoot,'builder','working');
    fs.mkdirSync(workingDir,{recursive:true});
    fs.writeFileSync(path.join(workingDir,'autobot-repair-candidate.patch'),patchOut);
    fs.writeFileSync(path.join(workingDir,'autobot-repair-base-commit.txt'),`${qaBase}\n`);
    fs.writeFileSync(path.join(workingDir,'autobot-repair-commit.txt'),`${repairCommit}\n`);
    process.env.AUTOBOT_REVIEW_OUTPUT=path.join(workingDir,'autobot-review.json');
    process.env.AUTOBOT_HANDOFF_OUTPUT=path.join(workingDir,'autobot-verified-candidate.json');
    await import(pathToFileURL(path.join(recoveryRoot,'builder/runner/autobot-verified-candidate-handoff.mjs')).href);
    const handoffFiles=['autobot-verified-candidate.json','autobot-repair-candidate.patch','autobot-repair-base-commit.txt','autobot-repair-commit.txt','autobot-review.json'];
    const publishDir=path.join(originalRoot,'builder','working');
    fs.mkdirSync(publishDir,{recursive:true});
    for(const name of handoffFiles){
      const source=path.join(workingDir,name);
      if(fs.existsSync(source))fs.copyFileSync(source,path.join(publishDir,name));
    }
    fs.writeFileSync(path.join(publishDir,'autobot-specialist-recovery-outcome.json'),JSON.stringify({schemaVersion:'autobot-specialist-recovery-outcome-v1',botId:outcome.botId,status:'verified-candidate',failureId:queueRecord.id,baseCommit:qaBase,candidateCommit:repairCommit,branch:restoredBranch||branch},null,2)+'\\n');
  }
  console.log(JSON.stringify({ok:result?.ok===true,failureId:queueRecord.id,botId:outcome.botId,restoredBase:base,restoredCandidate:restoredCommit,recovery:result,preflight,verifiedCandidate:fs.existsSync(path.join(originalRoot,'builder','working','autobot-verified-candidate.json'))},null,2));
  if(result?.ok!==true)process.exitCode=3;
}finally{process.chdir(originalRoot);cleanup();}
