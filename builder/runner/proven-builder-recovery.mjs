#!/usr/bin/env node
/** Restore one proven-worker candidate and send it through Repair -> QA -> Reviewer. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const source=path.resolve(process.argv[2]||'builder/working/worker-result');
const outcome=JSON.parse(fs.readFileSync(path.join(source,'autobot-proven-worker-outcome.json'),'utf8'));
if(outcome.status!=='failure'||outcome.repairable!==true) throw new Error('Recovery refused: no explicit repairable product failure.');
if(!/^[0-9a-f]{40}$/i.test(outcome.baseCommit||'')) throw new Error('Recovery refused: missing exact worker base commit.');
const patch=path.resolve(source,'autobot-proven-worker.patch');
if(!fs.existsSync(patch)||fs.statSync(patch).size===0) throw new Error('Recovery refused: missing candidate patch.');
const root=process.cwd();
const recoveryRoot=path.join(root,'builder','working',`proven-recovery-${outcome.workerId}`);
fs.rmSync(recoveryRoot,{recursive:true,force:true});
execFileSync('git',['worktree','add','--detach',recoveryRoot,outcome.baseCommit],{cwd:root,stdio:'inherit'});
try{
  execFileSync('git',['apply','--check',patch],{cwd:recoveryRoot,stdio:'inherit'});
  execFileSync('git',['apply','--whitespace=nowarn',patch],{cwd:recoveryRoot,stdio:'inherit'});
  execFileSync('git',['diff','--check'],{cwd:recoveryRoot,stdio:'inherit'});
  const queuePath=path.join(recoveryRoot,'builder','working','autobot-failure-queue.jsonl');
  fs.mkdirSync(path.dirname(queuePath),{recursive:true});
  const failure={id:`proven-${outcome.workerId}-${Date.now()}`,status:'open',source:'proven-builder-fleet',stage:'builder-failure',error:outcome.error||'Proven Builder product verification failed',expected:'Worker candidate passes production verification',actual:outcome.error||'Candidate requires repair',files:outcome.files||[],evidence:['autobot-proven-worker-outcome.json','autobot-proven-worker.patch'],retryable:true,repairHint:'Repair the actual restored proven-worker candidate, then run QA and Reviewer.'};
  fs.writeFileSync(queuePath,JSON.stringify(failure)+'\n');
  process.env.AUTOBOT_FAILURE_QUEUE_PATH=queuePath;
  process.env.AUTOBOT_REPAIR_BASE_COMMIT=outcome.baseCommit;
  process.env.AUTOBOT_REVIEW_OUTPUT=path.join(recoveryRoot,'builder','working','autobot-review.json');
  process.chdir(recoveryRoot);
  const recovery=await import(pathToFileURL(path.join(recoveryRoot,'builder','runner','autobot-fleet-recovery.mjs')).href+`?worker=${Date.now()}`);
  const result=await recovery.recoverFleet({failureId:failure.id});
  if(result.status!=='verified-candidate') throw new Error(`Repair pipeline did not verify candidate: ${result.status}`);
  const qa=result.qa||{};
  const repairPatch=execFileSync('git',['diff','--binary',`${qa.baseCommit}..${qa.repairCommit}`],{cwd:recoveryRoot,encoding:'utf8'});
  const changedFiles=execFileSync('git',['diff','--name-only',`${qa.baseCommit}..${qa.repairCommit}`],{cwd:recoveryRoot,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
  const handoff={schemaVersion:1,status:'integration-eligible',eligible:true,workerId:outcome.workerId,failureId:failure.id,baseCommit:qa.baseCommit,candidateCommit:qa.repairCommit,changedFiles,verificationSource:'repair-qa-review'};
  fs.writeFileSync(path.join(root,'builder','working','autobot-verified-candidate.json'),JSON.stringify(handoff,null,2)+'\n');
  fs.writeFileSync(path.join(root,'builder','working','autobot-repair-candidate.patch'),repairPatch);
  fs.writeFileSync(path.join(root,'builder','working','autobot-repair-base-commit.txt'),qa.baseCommit+'\n');
  fs.writeFileSync(path.join(root,'builder','working','autobot-repair-commit.txt'),qa.repairCommit+'\n');
  fs.writeFileSync(path.join(root,'builder','working','autobot-fleet-recovery.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(root,'builder','working','autobot-review.json'),JSON.stringify(result.review||{},null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}finally{
  process.chdir(root);
  execFileSync('git',['worktree','remove','--force',recoveryRoot],{cwd:root,stdio:'inherit'});
}
