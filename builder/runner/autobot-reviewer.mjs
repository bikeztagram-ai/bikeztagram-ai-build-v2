#!/usr/bin/env node
/**
 * Independent adversarial product reviewer foundation.
 * Reviews an explicit candidate in an isolated worktree without changing it,
 * merging it, or pushing it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { appendFailure } from './autobot-failure-queue.mjs';

const root=process.cwd();
const repo=root;
const base=process.env.AUTOBOT_REVIEW_BASE_COMMIT||execFileSync('git',['rev-parse','HEAD^'],{cwd:repo,encoding:'utf8'}).trim();
const candidate=process.env.AUTOBOT_REVIEW_COMMIT||execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const output=process.env.AUTOBOT_REVIEW_OUTPUT||path.join(root,'builder','working','autobot-review.json');
const protectedPaths=['builder/runner/aider-feature-brain.mjs','.github/workflows/autonomous-builder-v2-fast.yml','builder/brain/feature-objectives.json'];
function git(args,cwd=repo){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
function run(command,args,cwd){return execFileSync(command,args,{cwd,encoding:'utf8',stdio:'pipe'}).toString().trim();}
const changed=git(['diff','--name-only',`${base}..${candidate}`]).split(/\r?\n/).filter(Boolean);
const findings=[];
function finding(severity,code,message,evidence=[]){findings.push({severity,code,message,evidence});}
for(const file of changed){if(protectedPaths.includes(file))finding('critical','protected-path-change',`candidate changes protected path: ${file}`,[file]);}
const productFiles=changed.filter(file=>/^src\/(director|aiEditPlanner|renderer|editorialRhythm|executableTimeline|captionPlanner)\.js$/.test(file));
const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'bikeztagram-review-'));
let build='not-run';
try{
  git(['worktree','add','--detach',tempDir,candidate]);
  if(productFiles.length){
    const directorPath=path.join(tempDir,'src','director.js');
    const director=fs.existsSync(directorPath)?fs.readFileSync(directorPath,'utf8'):'';
    if(director.includes("const roles=desiredCount===1?['hero-ending']:['hook'")||director.includes("['hook',...middleRoles"))finding('high','fixed-story-template','director story construction appears to force hook/middle/hero-ending bookends instead of deriving structure from intent and evidence',['src/director.js']);
    if(!director.includes('rankDirectorCandidates'))finding('high','missing-evidence-selection','director story does not visibly use candidate ranking for selection',['src/director.js']);
    if(!director.includes('targetDuration'))finding('medium','missing-duration-input','director story does not visibly consume target duration',['src/director.js']);
  }
  if(!changed.length)finding('high','no-change','candidate contains no changes relative to review base');
  try{run('git',['diff','--check',`${base}..${candidate}`],tempDir);}catch(error){finding('critical','patch-integrity-failed','candidate diff has whitespace or patch-integrity errors',[String(error.stdout||error.stderr||error.message).slice(-1200)]);}
  try{build=run('npm',['run','build'],tempDir);}catch(error){finding('critical','build-failed','candidate build failed',[String(error.stdout||error.stderr||error.message).slice(-1200)]);}
}finally{try{git(['worktree','remove','--force',tempDir]);}catch{}}
const status=findings.some(f=>f.severity==='critical')?'reject':findings.some(f=>f.severity==='high')?'needs-repair':'pass';
const review={schemaVersion:1,reviewer:'autobot-reviewer',baseCommit:base,candidateCommit:candidate,changedFiles:changed,productFiles,status,findings,buildVerified:build!=='not-run',automaticMerge:false,automaticPush:false,generatedAt:new Date().toISOString()};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(review,null,2)+'\n');
if(status==='needs-repair' && productFiles.length){
  try{const failure=appendFailure({source:'autobot-reviewer',runId:candidate,stage:'adversarial-review',error:findings.filter(f=>f.severity==='high').map(f=>f.code).join(',')||'review requires repair',expected:'candidate passes adversarial product review',actual:status,files:productFiles,evidence:[output],retryable:true,repairHint:'Repair the reviewed candidate findings in an isolated Repair Bot worktree.'});review.failureId=failure.id;}catch(error){review.handoffError=String(error.message||error);}
}
fs.writeFileSync(output,JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify(review,null,2));
if(status==='reject')process.exit(2);
if(status==='needs-repair')process.exit(3);
