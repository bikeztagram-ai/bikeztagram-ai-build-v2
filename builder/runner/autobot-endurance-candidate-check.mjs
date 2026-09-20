#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {appendFailure} from './autobot-failure-queue.mjs';

const root=process.cwd(), bot=process.argv[2];
const specialistRoot=process.env.AUTOBOT_SPECIALIST_RESULTS_ROOT||'builder/working';
const outputPath=process.env.AUTOBOT_CANDIDATE_CHECK_OUTPUT||'builder/working/autobot-endurance-candidate-check.json';
const reviewOutputPath=process.env.AUTOBOT_CANDIDATE_REVIEW_OUTPUT||path.join(root,'builder/working','autobot-candidate-review.json');
const skipNpmInstall=String(process.env.AUTOBOT_SKIP_NPM_INSTALL||'').toLowerCase()==='true';
if(!bot)throw new Error('candidate check requires bot id');
const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;
function writeFailure(result){fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');}
function recordCandidateFailure(error,details={}){
  const message=String(error?.message||error||'candidate verification failed');
  const files=details.files||h?.ownsFiles||o?.files||[];
  const failure=appendFailure({source:'autobot-endurance-candidate-check',runId:process.env.GITHUB_RUN_ID||'local',stage:'candidate-verification',error:message,expected:'Specialist candidate passes independent QA and Reviewer verification',actual:message,files,evidence:[path.join(specialistRoot,bot,'autobot-specialist-handoff.json'),path.join(specialistRoot,bot,'autobot-specialist-outcome.json')].filter(fs.existsSync),attempted:['candidate scope/build/product-quality/reviewer verification'],retryable:true,repairHint:'Repair the candidate from its exact candidate commit, then rerun independent QA and Reviewer.',metadata:{candidateFailure:true,specialistBotId:bot,specialistBaseCommit:base||null,candidateCommit:candidate||null,candidateBranch:branch||null,repairBaseCommit:candidate||base||null}});
  const result={schemaVersion:1,botId:bot,status:'failure',integrationEligible:false,repairable:true,failureId:failure.id,baseCommit:base,candidateCommit:candidate,branch,changedFiles:files,error:message,recovered:Boolean(r),generatedAt:new Date().toISOString()};
  writeFailure(result);return result;
}
async function recoverCandidate(failureId){
  const module=await import('./autobot-fleet-recovery.mjs');
  return module.recoverFleet({failureId});
}
function materializeRecovered(result){
  if(!result?.ok||result.status!=='verified-candidate')return false;
  const baseCommit=result.qa?.baseCommit||result.repair?.baseCommit;
  const candidateCommit=result.qa?.repairCommit||result.repair?.commit;
  const branch=result.repair?.branch;
  if(!/^[0-9a-f]{40}$/i.test(String(baseCommit||''))||!/^[0-9a-f]{40}$/i.test(String(candidateCommit||''))||!branch)return false;
  const recoveryDir=path.join(specialistRoot,bot,'recovery');fs.mkdirSync(recoveryDir,{recursive:true});
  const patchFile=path.join(recoveryDir,'autobot-repair-candidate.patch');
  const patchData=execFileSync('git',['diff','--binary',`${baseCommit}..${candidateCommit}`],{encoding:'utf8'});if(!patchData.trim())return false;
  fs.writeFileSync(patchFile,patchData);
  fs.writeFileSync(path.join(recoveryDir,'autobot-repair-base-commit.txt'),`${baseCommit}\n`);
  fs.writeFileSync(path.join(recoveryDir,'autobot-repair-commit.txt'),`${candidateCommit}\n`);
  fs.writeFileSync(path.join(recoveryDir,'autobot-verified-candidate.json'),JSON.stringify({schemaVersion:1,botId:bot,status:'verified-candidate',baseCommit,candidateCommit: candidateCommit,branch,changedFiles:result.qa?.changedFiles||[],recovered:true},null,2)+'\n');
  return {baseCommit,candidateCommit,branch};
}
const h=read(path.join(specialistRoot,bot,'autobot-specialist-handoff.json'));
const o=read(path.join(specialistRoot,bot,'autobot-specialist-outcome.json'));
const r=read(path.join(specialistRoot,bot,'recovery','autobot-verified-candidate.json'));
const patch=path.join(specialistRoot,bot,'recovery','autobot-repair-candidate.patch');
let candidate=r?.candidateCommit||h?.candidateCommit;
let base=r?.baseCommit||h?.baseCommit;
let branch=r?.branch||h?.branch;
if(o?.status==='failure'&&!r){const failure=recordCandidateFailure(new Error('No verified recovery candidate exists for '+bot));process.exitCode=2;return;}
if(!candidate||!base)throw new Error('Candidate handoff is incomplete for '+bot);
if(!/^[0-9a-f]{40}$/i.test(candidate)||!/^[0-9a-f]{40}$/i.test(base))throw new Error('Candidate/base must be full SHAs');

const temp=path.join(os.tmpdir(),'bikeztagram-endurance-'+bot+'-'+process.pid);
async function main(){
try{
  if(r){
    if(!fs.existsSync(patch))throw new Error('Recovered candidate is missing its verified patch');
    execFileSync('git',['worktree','add','--detach',temp,base],{stdio:'inherit'});
    if(skipNpmInstall){const modules=path.join(root,'node_modules');if(!fs.existsSync(modules))throw new Error('AUTOBOT_SKIP_NPM_INSTALL requested but root node_modules is missing');fs.symlinkSync(modules,path.join(temp,'node_modules'),'dir');}
    execFileSync('git',['apply','--check',path.resolve(patch)],{cwd:temp,stdio:'inherit'});
    execFileSync('git',['apply','--whitespace=nowarn',path.resolve(patch)],{cwd:temp,stdio:'inherit'});
    execFileSync('git',['diff','--check'],{cwd:temp,stdio:'inherit'});
    branch='autobot/endurance/recovered-'+bot+'-'+process.env.GITHUB_RUN_ID;
    execFileSync('git',['checkout','-b',branch],{cwd:temp,stdio:'inherit'});
    execFileSync('git',['add','--','.'],{cwd:temp,stdio:'inherit'});
    execFileSync('git',['commit','-m','chore(autobot): preserve verified recovery candidate'],{cwd:temp,stdio:'inherit'});
    candidate=execFileSync('git',['rev-parse','HEAD'],{cwd:temp,encoding:'utf8'}).trim();
    execFileSync('git',['push','--set-upstream','origin',branch],{cwd:temp,stdio:'inherit'});
  }else{
    execFileSync('git',['fetch','origin','+refs/heads/'+branch+':refs/remotes/origin/'+branch],{stdio:'inherit'});
    execFileSync('git',['worktree','add','--detach',temp,candidate],{stdio:'inherit'});
    if(skipNpmInstall){const modules=path.join(root,'node_modules');if(!fs.existsSync(modules))throw new Error('AUTOBOT_SKIP_NPM_INSTALL requested but root node_modules is missing');fs.symlinkSync(modules,path.join(temp,'node_modules'),'dir');}
  }
  const files=execFileSync('git',['diff','--name-only',base,candidate],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
  const registry=JSON.parse(fs.readFileSync(path.join(root,'builder/brain/autobot-fleet.json'),'utf8'));
  const record=registry.bots.find(x=>x.id===bot);
  const unauthorized=files.filter(x=>!(record?.ownsFiles||[]).includes(x));
  if(unauthorized.length){const failure=recordCandidateFailure(new Error('candidate escaped scope: '+unauthorized.join(',')),{files});const recovery=await recoverCandidate(failure.failureId);const restored=materializeRecovered(recovery);if(restored){const result={schemaVersion:1,botId:bot,status:'pass',integrationEligible:true,baseCommit:restored.baseCommit,candidateCommit:restored.candidateCommit,branch:restored.branch,changedFiles:files,qa:{build:true,productQuality:true},review:{status:'pass',findings:[]},recovered:true,generatedAt:new Date().toISOString()};writeFailure(result);return;}process.exitCode=2;return;}
  if(!skipNpmInstall && spawnSync('npm',['install','--no-audit','--no-fund','--no-package-lock'],{cwd:temp,stdio:'inherit'}).status!==0){const failure=recordCandidateFailure(new Error('candidate QA dependency install failed'),{files});const recovery=await recoverCandidate(failure.failureId);const restored=materializeRecovered(recovery);if(restored){candidate=restored.candidateCommit;base=restored.baseCommit;branch=restored.branch;}else{process.exitCode=2;return;}}
  if(spawnSync('npm',['run','build'],{cwd:temp,stdio:'inherit'}).status!==0){const failure=recordCandidateFailure(new Error('candidate QA build failed'),{files});const recovery=await recoverCandidate(failure.failureId);const restored=materializeRecovered(recovery);if(restored){candidate=restored.candidateCommit;base=restored.baseCommit;branch=restored.branch;}else{process.exitCode=2;return;}}
  if(spawnSync('npm',['run','verify:autobot-product-change-quality'],{cwd:temp,stdio:'inherit'}).status!==0){const failure=recordCandidateFailure(new Error('candidate QA product-quality failed'),{files});const recovery=await recoverCandidate(failure.failureId);const restored=materializeRecovered(recovery);if(restored){candidate=restored.candidateCommit;base=restored.baseCommit;branch=restored.branch;}else{process.exitCode=2;return;}}
  const reviewOutput=reviewOutputPath;
  let reviewStatus='pass';
  try{
    execFileSync(process.execPath,['builder/runner/autobot-reviewer.mjs'],{cwd:root,env:{...process.env,AUTOBOT_REVIEW_BASE_COMMIT:base,AUTOBOT_REVIEW_COMMIT:candidate,AUTOBOT_REVIEW_OUTPUT:reviewOutput},stdio:'inherit'});
  }catch(e){reviewStatus=e.status===3?'needs-repair':'reject'}
  const review=fs.existsSync(reviewOutput)?JSON.parse(fs.readFileSync(reviewOutput,'utf8')):null;
  if(reviewStatus!=='pass'||review?.status!=='pass'){
    const failure=recordCandidateFailure(new Error('Reviewer rejected candidate: '+(review?.status||reviewStatus)),{files});
    const recovery=await recoverCandidate(failure.failureId);
    const restored=materializeRecovered(recovery);
    if(restored){const result={schemaVersion:1,botId:bot,status:'pass',integrationEligible:true,baseCommit:restored.baseCommit,candidateCommit:restored.candidateCommit,branch:restored.branch,changedFiles:files,qa:{build:true,productQuality:true},review:{status:'pass',findings:[]},recovered:true,generatedAt:new Date().toISOString()};writeFailure(result);return;}
    process.exitCode=2;return;
  }
  const result={schemaVersion:1,botId:bot,status:'pass',integrationEligible:true,baseCommit:base,candidateCommit:candidate,branch,changedFiles:files,qa:{build:true,productQuality:true},review:{status:'pass',findings:review.findings||[]},recovered:Boolean(r),generatedAt:new Date().toISOString()};
  fs.mkdirSync('builder/working',{recursive:true});
  fs.mkdirSync(path.dirname(outputPath),{recursive:true});
  fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}finally{try{execFileSync('git',['worktree','remove','--force',temp],{stdio:'ignore'});}catch{}}
}
main().catch(error=>{console.error(`[autobot-candidate-check] FATAL: ${error.message}`);process.exit(2);});
