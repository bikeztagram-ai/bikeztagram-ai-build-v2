#!/usr/bin/env node
/**
 * Recover one repairable Specialist Builder failure.
 *
 * The failed specialist patch is restored onto its exact base in an isolated
 * recovery checkout, then the existing Repair -> QA -> Reviewer chain handles
 * it. If the specialist's failure was only lifecycle/runtime-related and the
 * restored candidate independently passes the same build/product-quality
 * gates, recovery records that exact candidate for QA instead of asking Aider
 * to rewrite an already-valid product change.
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
function cleanup(){try{execFileSync('git',['worktree','remove','--force',recoveryRoot],{cwd:originalRoot,stdio:'ignore'});}catch{} }
function verifyCandidateTree(cwd){
  const install=spawnSync('npm',['install','--no-audit','--no-fund','--no-package-lock'],{cwd,encoding:'utf8',stdio:'inherit',timeout:180_000});
  if(install.error||install.status!==0)return {ok:false,stage:'npm-install',error:String(install.error?.message||install.status)};
  const build=spawnSync('npm',['run','build'],{cwd,encoding:'utf8',stdio:'inherit',timeout:120_000});
  if(build.error||build.status!==0)return {ok:false,stage:'build',error:String(build.error?.message||build.status)};
  const quality=spawnSync('npm',['run','verify:autobot-product-change-quality'],{cwd,encoding:'utf8',stdio:'inherit',timeout:120_000});
  if(quality.error||quality.status!==0)return {ok:false,stage:'product-quality',error:String(quality.error?.message||quality.status)};
  return {ok:true,stage:'build-and-product-quality'};
}

try{
  const base=outcome.baseCommit;
  execFileSync('git',['worktree','add','--detach',recoveryRoot,base],{cwd:originalRoot,stdio:'inherit'});
  process.chdir(recoveryRoot);
  // Recovery creates a temporary candidate commit. GitHub-hosted isolated
  // worktrees do not inherit a user identity, so configure a deterministic
  // AutoBot identity before the restore/Repair -> QA chain attempts to commit.
  run(['config','user.name','Bikeztagram AutoBot']);
  run(['config','user.email','autobot@bikeztagram.local']);
  process.env.AUTOBOT_FAILURE_QUEUE_PATH=path.join(recoveryRoot,'builder','working','autobot-failure-queue.jsonl');
  const {appendFailure}=await import(pathToFileURL(path.join(recoveryRoot,'builder','runner','autobot-failure-queue.mjs')).href);
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

  // A specialist can fail after producing a real candidate because the
  // controller lifecycle exits non-zero even though the product gates pass.
  // Do not make Aider rewrite an already-valid candidate; prove the restored
  // tree first, then let the normal QA -> Reviewer chain decide it.
  const preflight=verifyCandidateTree(recoveryRoot);
  if(preflight.ok){
    queueRecord.metadata={...(queueRecord.metadata||{}),preverifiedCandidate:true,preflight:preflight.stage};
    const queuePath=path.join(recoveryRoot,'builder','working','autobot-failure-queue.jsonl');
    const queueText=fs.readFileSync(queuePath,'utf8');
    const records=queueText.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
    const updated=records.map(record=>record.id===queueRecord.id?queueRecord:record);
    fs.writeFileSync(queuePath,updated.map(record=>JSON.stringify(record)).join('\n')+'\n');
    console.log(`[autobot] specialist ${outcome.botId} candidate passed recovery preflight; routing exact candidate to QA without a rewrite`);
  }

  const registry=JSON.parse(fs.readFileSync(path.join(recoveryRoot,'builder/brain/autobot-fleet.json'),'utf8'));
  if(registry.enabled!==true||registry.coordination?.mode!=='active')throw new Error('fleet recovery gate is not active');
  const recoveryPath=registry.coordination?.recoveryRunner;
  if(recoveryPath!=='builder/runner/autobot-fleet-recovery.mjs')throw new Error('registry recovery runner does not match the controlled recovery implementation');
  const {recoverFleet}=await import(pathToFileURL(path.join(recoveryRoot,recoveryPath)).href);
  const result=await recoverFleet({failureId:queueRecord.id});
  if(result?.status==='verified-candidate'){
    const qaBase=result.qa?.baseCommit;
    const repairCommit=result.qa?.repairCommit;
    if(!/^[0-9a-f]{40}$/i.test(qaBase)||!/^[0-9a-f]{40}$/i.test(repairCommit))throw new Error('verified recovery result is missing exact QA commit pair');
    const patch=git(['diff','--binary',`${qaBase}..${repairCommit}`]);
    if(!patch.trim())throw new Error('verified repair candidate contains no patch');
    const workingDir=path.join(recoveryRoot,'builder','working');
    fs.mkdirSync(workingDir,{recursive:true});
    fs.writeFileSync(path.join(workingDir,'autobot-repair-candidate.patch'),patch);
    fs.writeFileSync(path.join(workingDir,'autobot-repair-base-commit.txt'),`${qaBase}\n`);
    fs.writeFileSync(path.join(workingDir,'autobot-repair-commit.txt'),`${repairCommit}\n`);
    process.env.AUTOBOT_REVIEW_OUTPUT=path.join(workingDir,'autobot-review.json');
    process.env.AUTOBOT_HANDOFF_OUTPUT=path.join(workingDir,'autobot-verified-candidate.json');
    await import(pathToFileURL(path.join(recoveryRoot,'builder/runner/autobot-verified-candidate-handoff.mjs')).href);
  }
  console.log(JSON.stringify({ok:result?.ok===true,failureId:queueRecord.id,botId:outcome.botId,restoredBase:base,restoredCandidate:restoredCommit,recovery:result,verifiedCandidate:fs.existsSync(path.join(recoveryRoot,'builder','working','autobot-verified-candidate.json'))},null,2));
  if(result?.ok!==true)process.exitCode=3;
}finally{
  process.chdir(originalRoot);
  cleanup();
}