#!/usr/bin/env node
/**
 * AutoBot Repair Bot — isolated failure repair worker.
 *
 * Repairs one durable product failure in a disposable worktree. The protected
 * checkout is never edited, merged, or pushed. Aider is allowed to finish with
 * a non-zero status only when it has already produced a scoped candidate that
 * independently passes the same product verification gates. This preserves
 * the proven specialist behaviour: a controller timeout must not discard real,
 * verified work.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFailure, readFailures, transitionFailure } from './autobot-failure-queue.mjs';

const root=process.cwd();
const queuePath=process.env.AUTOBOT_FAILURE_QUEUE_PATH||path.join(root,'builder','working','autobot-failure-queue.jsonl');
const repairRoot=process.env.AUTOBOT_REPAIR_WORKTREE_ROOT||path.join(os.tmpdir(),'bikeztagram-autobot-repairs');
function normalizeAiderModel(value){const model=String(value||'').trim();return model?(model.includes('/')?model:`ollama_chat/${model}`):'ollama_chat/qwen2.5-coder:7b';}
const model=normalizeAiderModel(process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL);
const editFormat=String(process.env.AUTOBOT_REPAIR_EDIT_FORMAT||'udiff').trim().toLowerCase();
if(!['udiff','diff','whole'].includes(editFormat))throw new Error(`unsupported Repair Bot Aider edit format: ${editFormat}`);
const timeoutMs=Math.max(30_000,Number.parseInt(process.env.AUTOBOT_REPAIR_TIMEOUT_MS||String(30*60*1000),10));
const maxFiles=Math.max(1,Math.min(40,Number.parseInt(process.env.AUTOBOT_REPAIR_MAX_FILES||'12',10)));
const maxChangedLines=Math.max(4,Math.min(200,Number.parseInt(process.env.AUTOBOT_REPAIR_MAX_CHANGED_LINES||'80',10)));
const protectedPaths=['builder/runner/aider-feature-brain.mjs','builder/brain/feature-objectives.json','.github/workflows/autonomous-builder-v2-fast.yml','package.json','package-lock.json','pnpm-lock.yaml','yarn.lock','.env','.env.local'];
function git(args,cwd=root){return execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
function fail(message){throw new Error(message);}
function selectFailure(id){const open=readFailures({status:'open'});return id?open.find(record=>record.id===id)||null:open[0]||null;}
function validCommit(value){return /^[0-9a-f]{40}$/i.test(String(value||''));}
function validateFailure(record){
  if(!record)fail('no OPEN failure is available for repair');
  if(!Array.isArray(record.files)||!record.files.length)fail(`failure ${record.id} has no repair file scope`);
  const files=[...new Set(record.files.filter(Boolean))];
  if(files.length>maxFiles)fail(`failure ${record.id} exceeds repair file scope limit (${files.length}>${maxFiles})`);
  for(const file of files){
    if(file.startsWith('/')||file.includes('..'))fail(`unsafe repair path: ${file}`);
    if(protectedPaths.includes(file)||file.startsWith('.github/'))fail(`protected repair path: ${file}`);
    if(!fs.existsSync(path.join(root,file)))fail(`repair file does not exist in protected checkout: ${file}`);
  }
  return files;
}
function branchFor(id){return `autobot-repair/${id}`;}
function worktreeFor(id){return path.join(repairRoot,id);}
function promptFor(record,files){
  const focused=files.length===1&&record.expected&&record.actual&&record.repairHint;
  return [
    'You are the isolated Bikeztagram AI Repair Bot.',
    `Failure ID: ${record.id}`,
    `Failure stage: ${record.stage||'unknown'}`,
    `Error: ${record.error||'unspecified failure'}`,
    `Expected: ${JSON.stringify(record.expected??null)}`,
    `Actual: ${JSON.stringify(record.actual??null)}`,
    `Repair hint: ${JSON.stringify(record.repairHint??null)}`,
    `Evidence: ${JSON.stringify(record.evidence||[])}`,
    `Attempted work: ${JSON.stringify(record.attempted||[])}`,
    `ONLY these files may be modified: ${files.join(', ')}`,
    focused?'This is a focused product defect. Make the smallest possible source change that restores the stated expected behaviour. Treat Expected/Actual as an executable behaviour contract. Do not redesign, refactor, reformat, or inspect unrelated files.':'Inspect relevant callers, contracts and tests before editing. Repair the actual root cause, not the verifier.',
    'Preserve existing product behaviour, safety, rollback, audit, production gates and Gemini-free/provider-neutral rules.',
    'Do not weaken validators, remove tests, change protected infrastructure, add fake media, or alter unrelated files.',
    'Do not add dead helpers or metadata: repair logic must be connected to the production decision path.',
    'Run the narrowest relevant verification and npm run build when practical.',
    'Do not merge or push. Leave the isolated checkout with a focused repair candidate.'
  ].filter(Boolean).join('\n');
}
function cleanup(worktree,branch,keepBranch=false){try{git(['worktree','remove','--force',worktree]);}catch{}if(!keepBranch){try{git(['branch','-D',branch]);}catch{}}}
function claimOpenFailure(requestedId){
  const lockPath=`${queuePath}.claim-lock`;let fd=null;
  try{
    try{fd=fs.openSync(lockPath,'wx');}catch(error){fail(`another Repair Bot is claiming a failure (${error.code||'lock unavailable'})`);}
    const record=selectFailure(requestedId);if(!record)return null;
    transitionFailure(record.id,'claimed',{transitionedBy:'autobot-repair'});return record;
  }finally{if(fd!==null)try{fs.closeSync(fd);}catch{}try{fs.unlinkSync(lockPath);}catch{}}
}
function changedFiles(files,cwd){
  const changed=git(['diff','HEAD','--name-only','--',...files],cwd).split(/\r?\n/).filter(Boolean);
  const untracked=git(['ls-files','--others','--exclude-standard','--',...files],cwd).split(/\r?\n/).filter(Boolean);
  return [...new Set([...changed,...untracked])];
}
function verifyCandidate(cwd,files,focused){
  const touched=changedFiles(files,cwd);
  if(!touched.length)fail('Repair Bot produced no repository changes');
  const unauthorized=touched.filter(file=>!files.includes(file));
  if(unauthorized.length)fail(`repair modified files outside declared failure scope: ${unauthorized.join(', ')}`);
  execFileSync('git',['diff','HEAD','--check'],{cwd,stdio:'inherit'});
  const diffStat=git(['diff','HEAD','--numstat','--',...files],cwd).split(/\r?\n/).filter(Boolean);
  const changedLines=diffStat.reduce((sum,line)=>{const [added,deleted]=line.split(/\s+/);return sum+(Number.parseInt(added,10)||0)+(Number.parseInt(deleted,10)||0);},0);
  if(focused&&changedLines>maxChangedLines)fail(`focused repair is too large (${changedLines} changed lines > ${maxChangedLines} limit)`);
  const install=spawnSync('npm',['install','--no-audit','--no-fund','--no-package-lock'],{cwd,encoding:'utf8',stdio:'inherit',timeout:Math.min(180_000,timeoutMs)});
  if(install.error||install.status!==0)fail(`isolated npm install failed with ${install.status??'error'}`);
  const build=spawnSync('npm',['run','build'],{cwd,encoding:'utf8',stdio:'inherit',timeout:Math.min(120_000,timeoutMs)});
  if(build.error||build.status!==0)fail(`isolated npm run build failed with ${build.status??'error'}`);
  const quality=spawnSync('npm',['run','verify:autobot-product-change-quality'],{cwd,encoding:'utf8',stdio:'inherit',timeout:Math.min(120_000,timeoutMs)});
  if(quality.error||quality.status!==0)fail(`isolated product-quality verification failed with ${quality.status??'error'}`);
  return {touched,changedLines};
}
function runRepair(record,files){
  fs.mkdirSync(repairRoot,{recursive:true});
  const branch=branchFor(record.id);const worktree=worktreeFor(record.id);const requestedBase=record.metadata?.repairBaseCommit;const baseCommit=validCommit(requestedBase)?requestedBase:git(['rev-parse','HEAD']);
  cleanup(worktree,branch);git(['worktree','add','-b',branch,worktree,baseCommit]);let repaired=false;
  try{
    transitionFailure(record.id,'repairing',{transitionedBy:'autobot-repair',repairBranch:branch,repairBaseCommit:baseCommit});
    const focused=files.length===1&&record.expected&&record.actual&&record.repairHint;
    const allInSrc=files.every(file=>file.startsWith('src/'));
    const aiderCwd=allInSrc?path.join(worktree,'src'):worktree;
    const aiderFiles=allInSrc?files.map(file=>file.slice(4)):files;
    const mapTokens=allInSrc?0:256;
    const args=[`--model=${model}`,`--timeout=${Math.floor(timeoutMs/1000)}`,'--yes-always','--no-auto-commits','--no-dirty-commits','--no-gitignore','--no-show-model-warnings','--no-git',`--edit-format=${editFormat}`];
    if(focused&&editFormat==='diff')args.push('--no-git');
    args.push('--message',promptFor(record,files),...aiderFiles);
    console.log(`[repair] focused=${focused} cwd=${allInSrc?'src':'repo-root'} files=${files.length} mapTokens=${mapTokens}`);
    const result=spawnSync('aider',args,{cwd:aiderCwd,encoding:'utf8',stdio:['ignore','pipe','inherit'],timeout:timeoutMs});
    if(result.stdout)process.stderr.write(result.stdout);

    // Proven specialist behaviour: an Aider timeout/non-zero exit does not
    // automatically discard work. First inspect the candidate; if it is
    // scoped and passes the independent gates, preserve it for QA/Reviewer.
    const hasCandidate=changedFiles(files,worktree).length>0;
    if(result.error||result.status!==0){
      if(!hasCandidate)fail(`Aider repair failed with ${result.error?.code||result.status||'process error'}`);
      console.warn('[autobot] Aider ended non-zero after making a scoped repair candidate; verifying the candidate before rejecting it.');
    }

    const verification=verifyCandidate(worktree,files,focused);
    git(['add','--',...files],worktree);
    const staged=git(['diff','--cached','--name-only'],worktree).split(/\r?\n/).filter(Boolean);
    if(staged.some(file=>!files.includes(file)))fail(`repair staged files outside declared failure scope: ${staged.filter(file=>!files.includes(file)).join(', ')}`);
    if(!staged.length)fail('Repair Bot produced no staged product changes');
    git(['commit','-m',`fix(autobot): repair failure ${record.id}`],worktree);
    const commit=git(['rev-parse','HEAD'],worktree);
    const resolution=(result.error||result.status!==0)
      ? `Aider ended non-zero, but the scoped candidate passed diff, dependency install, build and product-quality verification (${verification.changedLines} changed lines); preserved for independent QA.`
      : 'isolated repair passed diff, dependency install, build and product-quality verification; awaiting independent QA.';
    transitionFailure(record.id,'repaired',{transitionedBy:'autobot-repair',repairBranch:branch,repairBaseCommit:baseCommit,repairCommit:commit,resolution});
    repaired=true;
    return {ok:true,failureId:record.id,branch,baseCommit,commit,preservedAfterNonzero:Boolean(result.error||result.status!==0),editFormat};
  }finally{cleanup(worktree,branch,repaired);}
}
export function repairOne({failureId=null}={}){const record=claimOpenFailure(failureId);if(!record)return {ok:true,status:'no-open-failure'};try{return runRepair(record,validateFailure(record));}catch(error){try{transitionFailure(record.id,'blocked',{transitionedBy:'autobot-repair',resolution:error.message});}catch(transitionError){console.error(`[repair] failed to record BLOCKED state: ${transitionError.message}`);}throw error;}}
export function repairPlan({failureId=null}={}){const record=readFailures({status:'open'}).find(item=>failureId?item.id===failureId:true);if(!record)return {ok:true,status:'no-open-failure'};const files=validateFailure(record);return {ok:true,status:'ready',failureId:record.id,stage:record.stage,files,isolatedBranch:branchFor(record.id),protectedCheckout:root};}
if(import.meta.url===`file://${process.argv[1]}`){const command=process.argv[2]||'repair';const failureId=process.argv[3]||null;if(command==='plan')console.log(JSON.stringify(repairPlan({failureId}),null,2));else if(command==='repair')console.log(JSON.stringify(repairOne({failureId}),null,2));else if(command==='record-test-failure')console.log(JSON.stringify(appendFailure({source:'autobot-repair-test',stage:'test',error:'synthetic repair test failure',files:['src/aiEditPlanner.js'],evidence:['synthetic'],retryable:true}),null,2));else fail(`unknown command: ${command}`);}
