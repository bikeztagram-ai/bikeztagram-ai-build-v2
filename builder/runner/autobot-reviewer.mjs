#!/usr/bin/env node
/**
 * Independent adversarial product reviewer foundation.
 * Reviews an already-built candidate without changing it, merging it, or pushing it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const repo=root;
const base=process.env.AUTOBOT_REVIEW_BASE_COMMIT||execFileSync('git',['rev-parse','HEAD^'],{cwd:repo,encoding:'utf8'}).trim();
const candidate=process.env.AUTOBOT_REVIEW_COMMIT||execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const output=process.env.AUTOBOT_REVIEW_OUTPUT||path.join(root,'builder','working','autobot-review.json');
const protectedPaths=['builder/runner/aider-feature-brain.mjs','.github/workflows/autonomous-builder-v2-fast.yml','builder/brain/feature-objectives.json'];
function git(args){return execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();}
function run(command,args){return execFileSync(command,args,{cwd:repo,encoding:'utf8',stdio:'pipe'}).toString().trim();}
function changedFiles(){return git(['diff','--name-only',`${base}..${candidate}`]).split(/\r?\n/).filter(Boolean);}
const changed=changedFiles();
const findings=[];
function finding(severity,code,message,evidence=[]){findings.push({severity,code,message,evidence});}
for(const file of changed){if(protectedPaths.includes(file))finding('critical','protected-path-change',`candidate changes protected path: ${file}`,[file]);}
const productFiles=changed.filter(file=>/^src\/(director|aiEditPlanner|renderer|editorialRhythm|executableTimeline|captionPlanner)\.js$/.test(file));
if(productFiles.length){
  const director=fs.existsSync(path.join(repo,'src','director.js'))?fs.readFileSync(path.join(repo,'src','director.js'),'utf8'):'';
  if(director.includes("const roles=desiredCount===1?['hero-ending']:['hook'")||director.includes("['hook',...middleRoles"))finding('high','fixed-story-template','director story construction appears to force hook/middle/hero-ending bookends instead of deriving structure from intent and evidence',['src/director.js']);
  if(!director.includes('rankDirectorCandidates'))finding('high','missing-evidence-selection','director story does not visibly use candidate ranking for selection',['src/director.js']);
  if(!director.includes('targetDuration'))finding('medium','missing-duration-input','director story does not visibly consume target duration',['src/director.js']);
}
const diff=git(['diff','--stat',`${base}..${candidate}`]);
if(!changed.length)finding('high','no-change','candidate contains no changes relative to review base');
let build='not-run';
try{build=run('npm',['run','build']);}catch(error){finding('critical','build-failed','candidate build failed',[String(error.stdout||error.stderr||error.message).slice(-1200)]);}
const status=findings.some(f=>f.severity==='critical')?'reject':findings.some(f=>f.severity==='high')?'needs-repair':'pass';
const review={schemaVersion:1,reviewer:'autobot-reviewer',baseCommit:base,candidateCommit:candidate,changedFiles:changed,productFiles,diffStat:diff,status,findings,buildVerified:build!=='not-run',automaticMerge:false,automaticPush:false,generatedAt:new Date().toISOString()};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify(review,null,2));
if(status==='reject')process.exit(2);
if(status==='needs-repair')process.exit(3);
