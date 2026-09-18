#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
const root=process.cwd(), bot=process.argv[2];
if(!bot)throw new Error('candidate check requires bot id');
const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;
const h=read('builder/working/specialist/autobot-specialist-handoff.json');
const o=read('builder/working/specialist/autobot-specialist-outcome.json');
const r=read('builder/working/recovery/autobot-verified-candidate.json');
const candidate=r?.candidateCommit||h?.candidateCommit, base=r?.baseCommit||h?.baseCommit, branch=r?.branch||h?.branch;
if(o?.status==='failure'&&!r)throw new Error('No verified recovery candidate exists for '+bot);
if(!candidate||!base||!branch)throw new Error('Candidate handoff is incomplete for '+bot);
if(!/^[0-9a-f]{40}$/i.test(candidate)||!/^[0-9a-f]{40}$/i.test(base))throw new Error('Candidate/base must be full SHAs');
execFileSync('git',['fetch','origin',branch],{stdio:'inherit'});
const temp=path.join(os.tmpdir(),'bikeztagram-endurance-'+bot+'-'+process.pid);
try{execFileSync('git',['worktree','add','--detach',temp,candidate],{stdio:'inherit'});
const files=execFileSync('git',['diff','--name-only',base,candidate],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const registry=JSON.parse(fs.readFileSync(path.join(root,'builder/brain/autobot-fleet.json'),'utf8'));
const record=registry.bots.find(x=>x.id===bot);
const unauthorized=files.filter(x=>!(record?.ownsFiles||[]).includes(x));
if(unauthorized.length)throw new Error('candidate escaped scope: '+unauthorized.join(','));
if(spawnSync('npm',['install','--no-audit','--no-fund','--no-package-lock'],{cwd:temp,stdio:'inherit'}).status!==0)throw new Error('candidate QA dependency install failed');
if(spawnSync('npm',['run','build'],{cwd:temp,stdio:'inherit'}).status!==0)throw new Error('candidate QA build failed');
if(spawnSync('npm',['run','verify:autobot-product-change-quality'],{cwd:temp,stdio:'inherit'}).status!==0)throw new Error('candidate QA product-quality failed');
const out=path.join(root,'builder/working/autobot-endurance-review.json');
let status='pass'; try{execFileSync(process.execPath,['builder/runner/autobot-reviewer.mjs'],{env:{...process.env,AUTOBOT_REVIEW_BASE_COMMIT:base,AUTOBOT_REVIEW_COMMIT:candidate,AUTOBOT_REVIEW_OUTPUT:out},stdio:'inherit'});}catch(e){status=e.status===3?'needs-repair':'reject'}
const review=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')):null;
if(status!=='pass'||review?.status!=='pass')throw new Error('Reviewer rejected candidate: '+(review?.status||status));
const result={schemaVersion:1,botId:bot,status:'pass',integrationEligible:true,baseCommit:base,candidateCommit:candidate,branch,changedFiles:files,qa:{build:true,productQuality:true},review:{status:'pass',findings:review.findings||[]},recovered:Boolean(r),generatedAt:new Date().toISOString()};
fs.mkdirSync('builder/working',{recursive:true}); fs.writeFileSync('builder/working/autobot-endurance-candidate-check.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
}finally{try{execFileSync('git',['worktree','remove','--force',temp],{stdio:'ignore'});}catch{}}
