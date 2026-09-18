#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';

const root=process.cwd(), bot=process.argv[2];
const specialistRoot=process.env.AUTOBOT_SPECIALIST_RESULTS_ROOT||'builder/working';
const outputPath=process.env.AUTOBOT_CANDIDATE_CHECK_OUTPUT||'builder/working/autobot-endurance-candidate-check.json';
const reviewOutputPath=process.env.AUTOBOT_CANDIDATE_REVIEW_OUTPUT||path.join(root,'builder/working','autobot-candidate-review.json');
const skipNpmInstall=String(process.env.AUTOBOT_SKIP_NPM_INSTALL||'').toLowerCase()==='true';
if(!bot)throw new Error('candidate check requires bot id');
const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;
const h=read(path.join(specialistRoot,bot,'autobot-specialist-handoff.json'));
const o=read(path.join(specialistRoot,bot,'autobot-specialist-outcome.json'));
const r=read(path.join(specialistRoot,bot,'recovery','autobot-verified-candidate.json'));
const patch=path.join(specialistRoot,bot,'recovery','autobot-repair-candidate.patch');
let candidate=r?.candidateCommit||h?.candidateCommit;
let base=r?.baseCommit||h?.baseCommit;
let branch=r?.branch||h?.branch;
if(o?.status==='failure'&&!r)throw new Error('No verified recovery candidate exists for '+bot);
if(!candidate||!base)throw new Error('Candidate handoff is incomplete for '+bot);
if(!/^[0-9a-f]{40}$/i.test(candidate)||!/^[0-9a-f]{40}$/i.test(base))throw new Error('Candidate/base must be full SHAs');

const temp=path.join(os.tmpdir(),'bikeztagram-endurance-'+bot+'-'+process.pid);
try{
  if(r){
    if(!fs.existsSync(patch))throw new Error('Recovered candidate is missing its verified patch');
    execFileSync('git',['worktree','add','--detach',temp,base],{stdio:'inherit'});
    if(skipNpmInstall){const modules=path.join(root,'node_modules');if(!fs.existsSync(modules))throw new Error('AUTOBOT_SKIP_NPM_INSTALL requested but root node_modules is missing');fs.symlinkSync(modules,path.join(temp,'node_modules'),'junction');}
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
    if(skipNpmInstall){const modules=path.join(root,'node_modules');if(!fs.existsSync(modules))throw new Error('AUTOBOT_SKIP_NPM_INSTALL requested but root node_modules is missing');fs.symlinkSync(modules,path.join(temp,'node_modules'),'junction');}
  }
  const files=execFileSync('git',['diff','--name-only',base,candidate],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
  const registry=JSON.parse(fs.readFileSync(path.join(root,'builder/brain/autobot-fleet.json'),'utf8'));
  const record=registry.bots.find(x=>x.id===bot);
  const unauthorized=files.filter(x=>!(record?.ownsFiles||[]).includes(x));
  if(unauthorized.length)throw new Error('candidate escaped scope: '+unauthorized.join(','));
  if(!skipNpmInstall && spawnSync('npm',['install','--no-audit','--no-fund','--no-package-lock'],{cwd:temp,stdio:'inherit'}).status!==0)throw new Error('candidate QA dependency install failed');
  if(spawnSync('npm',['run','build'],{cwd:temp,stdio:'inherit'}).status!==0)throw new Error('candidate QA build failed');
  if(spawnSync('npm',['run','verify:autobot-product-change-quality'],{cwd:temp,stdio:'inherit'}).status!==0)throw new Error('candidate QA product-quality failed');
  const reviewOutput=path.join(root,'builder/working/autobot-candidate-review.json');
  let reviewStatus='pass';
  try{
    execFileSync(process.execPath,['builder/runner/autobot-reviewer.mjs'],{cwd:root,env:{...process.env,AUTOBOT_REVIEW_BASE_COMMIT:base,AUTOBOT_REVIEW_COMMIT:candidate,AUTOBOT_REVIEW_OUTPUT:reviewOutput},stdio:'inherit'});
  }catch(e){reviewStatus=e.status===3?'needs-repair':'reject'}
  const review=fs.existsSync(reviewOutput)?JSON.parse(fs.readFileSync(reviewOutput,'utf8')):null;
  if(reviewStatus!=='pass'||review?.status!=='pass')throw new Error('Reviewer rejected candidate: '+(review?.status||reviewStatus));
  const result={schemaVersion:1,botId:bot,status:'pass',integrationEligible:true,baseCommit:base,candidateCommit:candidate,branch,changedFiles:files,qa:{build:true,productQuality:true},review:{status:'pass',findings:review.findings||[]},recovered:Boolean(r),generatedAt:new Date().toISOString()};
  fs.mkdirSync('builder/working',{recursive:true});
  fs.mkdirSync(path.dirname(outputPath),{recursive:true});
  fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}finally{try{execFileSync('git',['worktree','remove','--force',temp],{stdio:'ignore'});}catch{}}
