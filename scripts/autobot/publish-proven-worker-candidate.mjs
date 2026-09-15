#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const workerId=process.env.AUTOBOT_PROVEN_WORKER_ID||'proven-worker';
const runId=process.env.GITHUB_RUN_ID||'local';
const base=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const status=execFileSync('git',['status','--short','--','src','package.json','public','index.html','vite.config.js'],{encoding:'utf8'}).trim();
if(!status) throw new Error('Proven worker completed without a product diff to publish.');
const branch=`autobot-proven/${workerId}/${runId}`;
execFileSync('git',['checkout','-b',branch],{stdio:'inherit'});
execFileSync('git',['config','user.name','Bikeztagram Proven AutoBot'],{stdio:'inherit'});
execFileSync('git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],{stdio:'inherit'});
execFileSync('git',['add','--','src','package.json','public','index.html','vite.config.js'],{stdio:'inherit'});
execFileSync('git',['commit','-m',`feat(autobot): proven worker ${workerId} checkpoint`],{stdio:'inherit'});
const candidateCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=execFileSync('git',['diff','--name-only',`${base}..${candidateCommit}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
execFileSync('git',['push','--set-upstream','origin',branch],{stdio:'inherit'});
const handoff={schemaVersion:'autobot-proven-handoff-v1',status:'verified-candidate',workerId,objectiveId:null,baseCommit:base,candidateCommit,branch,ownsFiles:files,productQualityCheck:'npm run verify:autobot-production-gate',downstream:{qaRequired:true,reviewerRequired:true,automaticMerge:false}};
fs.writeFileSync('builder/working/autobot-proven-handoff.json',JSON.stringify(handoff,null,2)+'\n');
fs.writeFileSync('builder/working/autobot-specialist-handoff.json',JSON.stringify({...handoff,schemaVersion:'autobot-specialist-handoff-v1'},null,2)+'\n');
console.log(JSON.stringify(handoff,null,2));
