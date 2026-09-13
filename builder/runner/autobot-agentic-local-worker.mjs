#!/usr/bin/env node
/**
 * Agentic local AutoBot worker.
 * Runs mini-SWE-agent in an isolated git worktree against a local model endpoint,
 * then imports only an explicitly allowed diff into the real checkout.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const target = process.env.AUTOBOT_LOCAL_TARGET || 'builder/runner/aider-feature-brain.mjs';
const allowed = new Set((process.env.AUTOBOT_ALLOWED_PATHS || target).split(',').map(s => s.trim()).filter(Boolean));
const mini = process.env.MINI_SWE_AGENT_BIN || 'mini';
const model = process.env.AUTOBOT_AGENT_MODEL || 'local-qwen-coder';
const apiBase = process.env.AUTOBOT_AGENT_API_BASE || 'http://127.0.0.1:8080/v1';
const maxSteps = Number(process.env.AUTOBOT_AGENT_MAX_STEPS || 8);
const wallSeconds = Number(process.env.AUTOBOT_AGENT_WALL_SECONDS || 480);
const learningFiles = ['builder/working/aider-feature-brain-learning.json','builder/working/aider-feature-brain-state.json'];

const run = (cmd,args,options={}) => spawnSync(cmd,args,{cwd:root,encoding:'utf8',...options});
const git = (...args) => run('git',args);
function trackedChanges(cwd=root) {
  const r=spawnSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd,encoding:'utf8'});
  if(r.status!==0) throw new Error(`git status failed: ${r.stderr||r.stdout}`);
  return r.stdout.split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);
}
function learningSnapshot() {
  return learningFiles.map(file=>{
    const full=path.join(root,file);
    if(!fs.existsSync(full)) return `${file}: unavailable`;
    try{return `${file}: ${fs.readFileSync(full,'utf8').slice(-12000)}`;}catch{return `${file}: unreadable`;}
  }).join('\n');
}
function taskText() {
  return `SELF-EVOLUTION ONLY — PRODUCT WORK IS LOCKED.\n\nYou are the repair worker inside the Bikeztagram AI autonomous engineering fleet. Improve the autonomous engineering mechanism itself, not the Bikeztagram product.\n\nTarget/allowed files: ${[...allowed].join(', ')}\n\nObserved learning evidence:\n${learningSnapshot()}\n\nPrevious Aider/Qwen runs repeatedly timed out with zero verified edits. Work as an iterative software engineer: inspect the target and callers/contracts, identify the smallest useful improvement justified by the evidence, edit it, run focused checks, inspect failures, and repair your own change if needed.\n\nHard rules:\n- Modify ONLY the allowed files listed above.\n- Do NOT modify src/, product files, workflows, package manifests, safety/policy files, validators, objective definitions, secrets, or git configuration.\n- Do NOT weaken or bypass validators, locks, rollback, verification gates, no-auto-commit rules, or provider restrictions.\n- Do NOT create commits, branches, tags, pushes, or pull requests.\n- Do NOT invent benchmark results.\n- Prefer one small, concrete improvement directly justified by the learning evidence.\n- Run the narrowest relevant verification after editing.\n- Finish only when the change is genuinely useful and the worktree is ready for external verification.\n`;
}
function rollbackApplied(before) {
  for(const file of trackedChanges().filter(f=>!before.has(f))){
    spawnSync('git',['restore','--',file],{cwd:root,stdio:'ignore'});
    spawnSync('git',['clean','-fd','--',file],{cwd:root,stdio:'ignore'});
  }
}
function main(){
  if(!allowed.has(target)) throw new Error(`target is not in allowed scope: ${target}`);
  const initial=trackedChanges();
  if(initial.length) throw new Error(`real checkout is dirty before worker: ${initial.join(', ')}`);
  const baseSha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
  const worktree=fs.mkdtempSync(path.join(os.tmpdir(),'bikeztagram-autobot-worker-'));
  const trajectory=path.join(os.tmpdir(),`bikeztagram-autobot-trajectory-${process.pid}.json`);
  let workerExit=null; let workerOutput='';
  try{
    const add=git('worktree','add','--detach',worktree,baseSha);
    if(add.status!==0) throw new Error(`failed to create isolated worktree: ${add.stderr||add.stdout}`);
    const args=['-m',model,'-y','--exit-immediately','-l','0','-c','mini.yaml',`-c`,`agent.step_limit=${maxSteps}`,'-c',`agent.wall_time_limit_seconds=${wallSeconds}`,'-c','model.model_kwargs.api_base='+apiBase,'-c','model.model_kwargs.api_key=local-only','-c','model.model_kwargs.custom_llm_provider=openai','-t',taskText(),'-o',trajectory];
    const result=spawnSync(mini,args,{cwd:worktree,encoding:'utf8',timeout:(wallSeconds+90)*1000,maxBuffer:20*1024*1024,env:{...process.env,MSWEA_CONFIGURED:'1',MSWEA_COST_TRACKING:'ignore_errors'}});
    workerExit=result.status;
    workerOutput=`${result.stdout||''}\n${result.stderr||''}`.slice(-30000);
    if(workerExit!==0) throw new Error(`agent exited ${workerExit}; output:\n${workerOutput}`);
    const workerChanges=trackedChanges(worktree);
    const unauthorized=workerChanges.filter(file=>!allowed.has(file));
    if(unauthorized.length) throw new Error(`worker changed files outside scope: ${unauthorized.join(', ')}`);
    if(!workerChanges.length) throw new Error(`worker produced no file changes; output:\n${workerOutput}`);
    const diff=spawnSync('git',['diff','--binary','--',...allowed],{cwd:worktree,encoding:'utf8',maxBuffer:20*1024*1024});
    if(diff.status!==0||!diff.stdout.trim()) throw new Error('isolated worker produced no usable diff');
    const patch=path.join(root,'builder','working','autobot-agentic-local-candidate.patch');
    fs.mkdirSync(path.dirname(patch),{recursive:true}); fs.writeFileSync(patch,diff.stdout);
    const check=git('apply','--check',patch); if(check.status!==0) throw new Error(`candidate patch failed apply-check: ${check.stderr||check.stdout}`);
    const apply=git('apply','--whitespace=error',patch); if(apply.status!==0) throw new Error(`candidate patch failed to apply: ${apply.stderr||apply.stdout}`);
    const changed=trackedChanges(); const violations=changed.filter(file=>!allowed.has(file));
    if(violations.length) throw new Error(`applied candidate escaped scope: ${violations.join(', ')}`);
    const evidence={engine:'mini-swe-agent',model,apiBase,target,allowedPaths:[...allowed],baseSha,workerExit,changedPaths:changed,maxSteps,wallSeconds,verified:false,provider:'local-only',hostedApiRequired:false,trajectoryPath:trajectory,workerOutputTail:workerOutput,at:new Date().toISOString()};
    fs.mkdirSync(path.join(root,'builder','working'),{recursive:true});
    fs.writeFileSync(path.join(root,'builder','working','autobot-agentic-local-result.json'),JSON.stringify(evidence,null,2)+'\n');
    console.log(JSON.stringify(evidence,null,2));
  }catch(error){rollbackApplied(new Set(initial));throw error;}
  finally{spawnSync('git',['worktree','remove','--force',worktree],{cwd:root,stdio:'ignore'});try{fs.rmSync(trajectory,{force:true});}catch{}}
}
try{main();}catch(error){console.error(`[autobot-agentic-local] ${error.message}`);process.exit(1);}
