#!/usr/bin/env node
/**
 * Persistent AutoBot cycle engine.
 *
 * The GitHub job is the long-lived execution boundary. Planner -> parallel
 * Specialists -> Repair -> independent QA/Reviewer -> Carry-forward repeats
 * inside the same runner, so Aider/Ollama/npm are loaded once instead of once
 * per repository_dispatch workflow run.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync, execFileSync} from 'node:child_process';
import {appendAudit, verifyAuditLog} from '../quality/audit-log.mjs';

const root=process.cwd();
const repo=process.env.GITHUB_REPOSITORY;
const totalMinutes=parseDuration(process.env.AUTOBOT_TOTAL_DURATION||'30m');
const configuredCycleMinutes=Math.max(1,Number.parseInt(process.env.AUTOBOT_CYCLE_MINUTES||'15',10));
const finishGraceMinutes=Math.max(0,Number.parseInt(process.env.AUTOBOT_FINISH_GRACE_MINUTES||'0',10));
const safetyMinutes=Math.max(1,Number.parseInt(process.env.AUTOBOT_CYCLE_SAFETY_MINUTES||'1',10));
const startMs=Number.parseInt(process.env.AUTOBOT_RUN_STARTED_EPOCH_MS||String(Date.now()),10);
const normalDeadlineMs=startMs+totalMinutes*60_000;
const hardDeadlineMs=normalDeadlineMs+finishGraceMinutes*60_000;
const bots=['director-builder','timeline-builder'];
const maxNoProgressCycles=Math.max(1,Number.parseInt(process.env.AUTOBOT_MAX_NO_PROGRESS_CYCLES||'2',10));
const repairTimeoutMs=Math.max(60_000,Math.min(12*60_000,Number.parseInt(process.env.AUTOBOT_REPAIR_TIMEOUT_MS||String(8*60_000),10)));
const statusPath=path.join(root,'builder','working','autobot-live-status.log');
function status(message){const line=`[${new Date().toISOString()}] ${message}`;console.log(`\\n${line}`);fs.mkdirSync(path.dirname(statusPath),{recursive:true});fs.appendFileSync(statusPath,line+'\\n');}

function parseDuration(v){
  const value=String(v).trim().toLowerCase();
  const hm=value.match(/^(\d+)h(\d{1,2})m?$/);
  if(hm){const minutes=Number(hm[2]); if(minutes>=60)return 30; return Number(hm[1])*60+minutes;}
  const m=value.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/);
  if(!m)return 30;
  const n=Number(m[1]); return /h/.test(m[2]||'')?n*60:n;
}
function fail(msg){throw new Error(msg);}
function git(args){return execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();}
function run(command,args,env={}){
  const r=spawnSync(command,args,{cwd:root,stdio:'inherit',env:{...process.env,...env}});
  if(r.error||r.status!==0)fail(`${command} ${args.join(' ')} failed with status ${r.status??'error'}`);
}
function spawnLogged(command,args,env={}){
  return new Promise(resolve=>{
    const child=spawn(command,args,{cwd:root,stdio:'inherit',env:{...process.env,...env}});
    child.on('error',error=>resolve({status:1,error}));
    child.on('exit',(status,signal)=>resolve({status:status??1,signal}));
  });
}
function readJson(file,fallback=null){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function remainingMs(){return Math.max(0,hardDeadlineMs-Date.now());}
function remainingNormalMs(){return Math.max(0,normalDeadlineMs-Date.now());}
function log(message){console.log(`[autobot-persistent] ${message}`);}
function audit(stage,data={}){appendAudit(stage,{...data,runId:process.env.GITHUB_RUN_ID||null});}
function assertAudit(stage){const result=verifyAuditLog();if(!result.valid)fail(`audit integrity failure before ${stage}: ${result.error}`);}
function ensureClean(){run('git',['reset','--hard']);run('git',['clean','-fd','builder/working']);}
function checkoutBase(ref){
  if(/^[0-9a-f]{40}$/i.test(String(ref))){
    run('git',['fetch','origin',String(ref)]);
    run('git',['checkout','--detach',String(ref)]);
    return;
  }
  run('git',['fetch','origin',`+refs/heads/${ref}:refs/remotes/origin/${ref}`]);
  run('git',['checkout','--detach',ref]);
}
function objectiveFor(plan,bot){
  const item=plan?.workers?.find(x=>x.botId===bot);
  if(!item)fail(`planner produced no objective for ${bot}`);
  return [item.title,item.whyNow,'Acceptance:',...(item.acceptance||[])].join('\n');
}
function resultDir(bot){return path.join(root,'builder','working','persistent',`cycle-${process.env.AUTOBOT_CYCLE_NUMBER||'1'}`,bot);}
function setCycleEnv(cycle){process.env.AUTOBOT_CYCLE_NUMBER=String(cycle);}
function assertScope(bot,check){
  if(check?.status!=='pass'||check?.integrationEligible!==true)fail(`candidate ${bot} is not integration eligible`);
}
function copyIfExists(from,to){if(fs.existsSync(from)){fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);return true;}return false;}

async function runSpecialists(cycle,plan){
  const jobs=bots.map(bot=>{
    const dir=resultDir(bot);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
    return spawnLogged(process.execPath,['builder/runner/autobot-specialist-builder.mjs'],{
      AUTOBOT_SPECIALIST_BOT_ID:bot,
      AUTOBOT_SPECIALIST_OBJECTIVE:objectiveFor(plan,bot),
      AUTOBOT_SPECIALIST_BUILDER_ENABLED:'true',
      AUTOBOT_SPECIALIST_PRODUCT_QUALITY_CHECK:'npm run verify:autobot-product-change-quality',
      AUTOBOT_SPECIALIST_FEATURE_ENGINE:'aider',
      AUTOBOT_SPECIALIST_FALLBACK_MODEL:process.env.AUTOBOT_SPECIALIST_FALLBACK_MODEL||'qwen2.5-coder:3b',
      AUTOBOT_SPECIALIST_FALLBACK_MINUTES:process.env.AUTOBOT_SPECIALIST_FALLBACK_MINUTES||'4',
      AUTOBOT_AIDER_CALL_TIMEOUT_MS:'150000',
      AUTOBOT_FINISH_GRACE_MINUTES:'0',
      BUILDER_MAX_MINUTES:String(Math.max(1,Math.min(configuredCycleMinutes,Math.max(1,Math.floor((remainingNormalMs()-safetyMinutes*60_000)/60_000))))),
      AUTOBOT_SPECIALIST_OUTCOME_PATH:path.join(dir,'autobot-specialist-outcome.json'),
      AUTOBOT_SPECIALIST_HANDOFF_PATH:path.join(dir,'autobot-specialist-handoff.json'),
      AUTOBOT_SPECIALIST_FAILURE_PATCH_PATH:path.join(dir,'autobot-specialist-failure.patch'),
      AUTOBOT_FEATURE_ENGINE:'aider',
    });
  });
  const results=await Promise.all(jobs);
  for(let i=0;i<bots.length;i++){
    const bot=bots[i],dir=resultDir(bot),outcome=readJson(path.join(dir,'autobot-specialist-outcome.json'));
    if(!outcome){
      writeJson(path.join(dir,'autobot-specialist-outcome.json'),{schemaVersion:'autobot-specialist-outcome-v1',botId:bot,status:'failure',category:'infrastructure',repairable:false,error:`specialist exited without an outcome (status ${results[i].status})`});
    } else if(outcome.status==='success') {
      const handoff=readJson(path.join(dir,'autobot-specialist-handoff.json'));
      if(!handoff?.branch||!handoff?.candidateCommit)fail(`successful specialist ${bot} did not publish a complete handoff`);
      run('git',['push','--set-upstream','origin',handoff.branch]);
      log(`published ${bot} candidate ${handoff.candidateCommit}`);
    }
  }
  return results;
}

async function recoverCandidateFailures(results,cycle){
  const failed=results.filter(item=>item.check?.status!=='pass'&&item.check?.failureId&&item.check?.repairable===true);
  if(!failed.length)return;
  const boundedRepairTimeout=Math.min(repairTimeoutMs,Math.max(60_000,remainingNormalMs()-safetyMinutes*60_000));
  process.env.AUTOBOT_REPAIR_TIMEOUT_MS=String(boundedRepairTimeout);
  status(`RECOVERY budget | ${Math.ceil(boundedRepairTimeout/60000)}m max Repair Aider window`);
  for(const item of failed){
    const failureId=item.check.failureId;
    status(`RECOVERY routing ${item.bot} candidate failure ${failureId}`);
    const recoveryModule=await import(new URL('./autobot-fleet-recovery.mjs',import.meta.url));
    let recovery;
    try{
      recovery=await recoveryModule.recoverFleet({failureId});
    }catch(error){
      const message=String(error?.message||error);
      const recoveryDir=path.join(root,'builder','working','persistent',`cycle-${cycle}`,item.bot,'recovery');
      fs.mkdirSync(recoveryDir,{recursive:true});
      writeJson(path.join(recoveryDir,'autobot-recovery-failure.json'),{
        schemaVersion:1,
        botId:item.bot,
        failureId,
        status:'recovery-failed',
        recoverableCycleFailure:true,
        error:message,
        preservedBase:true,
        generatedAt:new Date().toISOString()
      });
      audit('recovery-attempt-failed',{cycle,bot:item.bot,failureId,error:message});
      status(`RECOVERY bounded failure | ${item.bot} | ${message} | preserving verified base for next cycle`);
      continue;
    }
    if(!recovery?.ok||recovery.status!=='verified-candidate'){
      const message=String(recovery?.status||'unknown');
      const recoveryDir=path.join(root,'builder','working','persistent',`cycle-${cycle}`,item.bot,'recovery');
      fs.mkdirSync(recoveryDir,{recursive:true});
      writeJson(path.join(recoveryDir,'autobot-recovery-failure.json'),{
        schemaVersion:1,
        botId:item.bot,
        failureId,
        status:'recovery-failed',
        recoverableCycleFailure:true,
        error:message,
        preservedBase:true,
        generatedAt:new Date().toISOString()
      });
      audit('recovery-attempt-failed',{cycle,bot:item.bot,failureId,error:message});
      status(`RECOVERY bounded failure | ${item.bot} | ${message} | preserving verified base for next cycle`);
      continue;
    }
    const baseCommit=recovery.qa?.baseCommit||recovery.repair?.baseCommit;
    const candidateCommit=recovery.qa?.repairCommit||recovery.repair?.commit;
    const branchName=recovery.repair?.branch;
    if(!/^[0-9a-f]{40}$/i.test(String(baseCommit||''))||!/^[0-9a-f]{40}$/i.test(String(candidateCommit||''))||!branchName)fail(`Recovery for ${item.bot} did not return exact base/candidate/branch identifiers`);
    const recoveryDir=path.join(root,'builder','working','persistent',`cycle-${cycle}`,item.bot,'recovery');
    fs.mkdirSync(recoveryDir,{recursive:true});
    // Persist exact immutable commit identity. The candidate checker reconstructs
    // this commit directly in a detached worktree; no generated patch is used
    // as an inter-process transport layer.
    run('git',['rev-parse','--verify',candidateCommit]);
    run('git',['diff','--check',`${baseCommit}..${candidateCommit}`]);
    fs.writeFileSync(path.join(recoveryDir,'autobot-repair-base-commit.txt'),`${baseCommit}\n`);
    fs.writeFileSync(path.join(recoveryDir,'autobot-repair-commit.txt'),`${candidateCommit}\n`);
    fs.writeFileSync(path.join(recoveryDir,'autobot-verified-candidate.json'),JSON.stringify({schemaVersion:1,botId:item.bot,status:'verified-candidate',baseCommit,candidateCommit,branch:branchName,changedFiles:recovery.qa?.changedFiles||[],recovered:true,recoveryTransport:'exact-commit',failureId},null,2)+'\n');
  }
}

async function runRepairs(){
  for(const bot of bots){
    const dir=resultDir(bot),outcome=readJson(path.join(dir,'autobot-specialist-outcome.json'));
    if(outcome?.status==='failure'&&outcome.repairable===true&&outcome.category==='product-change'){
      log(`Repair Bot routing ${bot}`);
      const r=await spawnLogged(process.execPath,['builder/runner/autobot-specialist-recovery.mjs',dir]);
      for(const name of ['autobot-verified-candidate.json','autobot-repair-candidate.patch','autobot-repair-base-commit.txt','autobot-repair-commit.txt','autobot-review.json','autobot-specialist-recovery-outcome.json']){
        copyIfExists(path.join(root,'builder','working',name),path.join(dir,'recovery',name));
      }
      if(r.status!==0)log(`Repair Bot ${bot} ended with status ${r.status}; QA will reject any incomplete handoff`);
    }else{
      writeJson(path.join(dir,'recovery','autobot-specialist-recovery-outcome.json'),{schemaVersion:'autobot-specialist-recovery-outcome-v1',botId:bot,status:'not-routed',reason:'No repairable product failure was classified.'});
    }
  }
}

async function verifyCandidates(cycle){
  const jobs=bots.map(bot=>{
    const dir=resultDir(bot);
    return spawnLogged(process.execPath,['builder/runner/autobot-endurance-candidate-check.mjs',bot],{
      AUTOBOT_SPECIALIST_RESULTS_ROOT:path.join(root,'builder','working','persistent',`cycle-${cycle}`),
      AUTOBOT_CANDIDATE_CHECK_OUTPUT:path.join(dir,'autobot-candidate-check.json'),
      AUTOBOT_CANDIDATE_REVIEW_OUTPUT:path.join(dir,'autobot-candidate-review.json'),
      AUTOBOT_SKIP_NPM_INSTALL:'true',
    });
  });
  const results=await Promise.all(jobs);
  return results.map((r,i)=>({bot:bots[i],...r,check:readJson(path.join(resultDir(bots[i]),'autobot-candidate-check.json'))}));
}

function integrate(cycle,baseRef,verified){
  ensureClean();
  checkoutBase(baseRef);
  const branch=`autobot/persistent/cycle-${cycle}-${process.env.GITHUB_RUN_ID||Date.now()}`;
  run('git',['checkout','-b',branch]);
  for(const item of verified){
    assertScope(item.bot,item.check);
    const candidateBranch=item.check.branch,candidate=item.check.candidateCommit;
    run('git',['fetch','origin',`+refs/heads/${candidateBranch}:refs/remotes/origin/${candidateBranch}`]);
    const fetched=git(['rev-parse',`refs/remotes/origin/${candidateBranch}`]);
    if(fetched!==candidate)fail(`candidate SHA mismatch for ${item.bot}: expected ${candidate}, fetched ${fetched}`);
    run('git',['merge','--no-edit','--no-ff',`origin/${candidateBranch}`]);
  }
  run('npm',['run','build']);
  run('npm',['run','verify:autobot-product-change-quality']);
  run('git',['diff','--check']);
  run('git',['push','--set-upstream','origin',branch]);
  return branch;
}

async function cycle(cycleNumber,baseRef){
  setCycleEnv(cycleNumber);
  assertAudit(`cycle-${cycleNumber}-start`);
  audit('iteration-started',{cycle:cycleNumber,mode:'specialist-fleet',baseRef,remainingMinutes:Number((remainingMs()/60000).toFixed(2)),normalRemainingMinutes:Number((remainingNormalMs()/60000).toFixed(2)),specialists:bots});
  status(`===== CYCLE ${cycleNumber} =====`);
  log(`base=${baseRef}; remaining=${(remainingMs()/60000).toFixed(1)}m; specialist budget=${configuredCycleMinutes}m`);
  ensureClean();checkoutBase(baseRef);
  fs.rmSync(path.join(root,'builder','working','persistent',`cycle-${cycleNumber}`),{recursive:true,force:true});
  const rndOutput=path.join(root,'builder','working','persistent',`cycle-${cycleNumber}`,'autobot-rnd-brief.json');
  fs.mkdirSync(path.dirname(rndOutput),{recursive:true});
  run('node',['builder/runner/autobot-rnd.mjs'],{AUTOBOT_RND_OUTPUT:rndOutput,AUTOBOT_RND_MODEL:process.env.AUTOBOT_RND_MODEL||process.env.AUTOBOT_DISCOVERY_MODEL||'qwen2.5-coder:3b',AUTOBOT_RND_TIMEOUT_MS:'60000'});
  copyIfExists(rndOutput,path.join(root,'builder','working','autobot-rnd-brief.json'));
  audit('rnd-finished',{cycle:cycleNumber,rndOutput,recommendations:readJson(rndOutput,{recommendations:[]}).recommendations?.length||0});
  status(`R&D complete | recommendations=${readJson(rndOutput,{recommendations:[]}).recommendations?.length||0}`);
  run('node',['builder/runner/autobot-parallel-planner.mjs']);
  audit('planner-finished',{cycle:cycleNumber});
  const plan=readJson(path.join(root,'builder','working','autobot-parallel-plan.json'));
  if(!plan?.workers||plan.workers.length<2)fail('parallel planner did not produce two specialist packages');
  const plannedBots=bots.filter(bot=>plan.workers.some(worker=>worker.botId===bot));
  if(plannedBots.length!==bots.length)fail(`parallel planner did not assign every active specialist: missing ${bots.filter(bot=>!plannedBots.includes(bot)).join(', ')}`);
  status(`PLANNER complete | Director=${plan.workers.find(x=>x.botId==='director-builder')?.title||'missing'} | Timeline=${plan.workers.find(x=>x.botId==='timeline-builder')?.title||'missing'}`);
  status('SPECIALISTS starting in parallel | Director + Timeline');
  await runSpecialists(cycleNumber,plan);
  audit('specialists-finished',{cycle:cycleNumber});
  status('SPECIALISTS complete | candidate handoffs collected');
  status('REPAIR checking specialist failures');
  await runRepairs();
  audit('repair-finished',{cycle:cycleNumber});
  status('REPAIR complete');
  status('QA + REVIEWER starting independent verification');
  let verified=await verifyCandidates(cycleNumber);
  let failures=verified.filter(x=>x.check?.status!=='pass');
  audit('verification-finished',{cycle:cycleNumber,passed:verified.filter(x=>x.check?.status==='pass').length,total:verified.length,failedBots:failures.map(x=>x.bot)});
  status(`QA + REVIEWER complete | ${verified.filter(x=>x.check?.status==='pass').length}/${verified.length} passed`);
  if(failures.length){
    status(`RECOVERY starting | ${failures.map(x=>x.bot).join(', ')}`);
    await recoverCandidateFailures(verified,cycleNumber);
    verified=await verifyCandidates(cycleNumber);
    failures=verified.filter(x=>x.check?.status!=='pass');
    audit('recovery-verification-finished',{cycle:cycleNumber,passed:verified.filter(x=>x.check?.status==='pass').length,total:verified.length,failedBots:failures.map(x=>x.bot)});
    status(`RECOVERY + RECHECK complete | ${verified.filter(x=>x.check?.status==='pass').length}/${verified.length} passed`);
  }
  if(failures.length){
    const passed=verified.filter(x=>x.check?.status==='pass');
    if(passed.length){
      status(`RECOVERY incomplete | ${failures.map(x=>x.bot).join(', ')} not recovered; preserving ${passed.map(x=>x.bot).join(', ')} and continuing`);
      audit('partial-recovery',{cycle:cycleNumber,passedBots:passed.map(x=>x.bot),failedBots:failures.map(x=>x.bot),continueWithVerifiedWork:true});
      status('CARRY-FORWARD integrating verified candidates only');
      const nextRef=integrate(cycleNumber,baseRef,passed);
      audit('iteration-finished',{cycle:cycleNumber,status:'partially-verified-and-carried-forward',baseRef,nextRef,passedBots:passed.map(x=>x.bot),failedBots:failures.map(x=>x.bot)});
      assertAudit(`cycle-${cycleNumber}-partial-finish`);
      status(`CYCLE ${cycleNumber} PARTIALLY VERIFIED + CARRIED FORWARD | ${nextRef}`);
      return nextRef;
    }
    fail(`independent candidate verification failed after Repair/Recovery: ${failures.map(x=>x.bot).join(', ')}`);
  }
  status('CARRY-FORWARD integrating verified candidates');
  const nextRef=integrate(cycleNumber,baseRef,verified);
  audit('iteration-finished',{cycle:cycleNumber,status:'verified-and-carried-forward',baseRef,nextRef});
  assertAudit(`cycle-${cycleNumber}-finish`);
  status(`CYCLE ${cycleNumber} VERIFIED + CARRIED FORWARD | ${nextRef}`);
  return nextRef;
}

function writeFinalHandoff({status,baseRef,cycleNumber,audit,error=null}) {
  const handoffPath=path.join(root,'builder','working','autobot-final-handoff.json');
  let finalCommit=null;
  try {
    finalCommit=/^[0-9a-f]{40}$/i.test(String(baseRef)) ? String(baseRef) : git(['rev-parse',`origin/${baseRef}`]);
  } catch {}
  const cycles=(audit||[]).map(item=>{
    const cycleDir=path.join(root,'builder','working','persistent',`cycle-${item.cycle}`);
    const specialists=bots.map(bot=>{
      const check=readJson(path.join(cycleDir,bot,'autobot-candidate-check.json'));
      return {
        botId:bot,
        status:check?.status||'not-available',
        integrationEligible:check?.integrationEligible===true,
        baseCommit:check?.baseCommit||null,
        candidateCommit:check?.candidateCommit||null,
        branch:check?.branch||null,
        changedFiles:check?.changedFiles||[],
        recovered:check?.recovered===true
      };
    });
    return {...item,specialists};
  });
  writeJson(handoffPath,{
    schemaVersion:'autobot-final-handoff-v1',
    status,
    automaticMerge:false,
    requiresAssistantReview:true,
    requiresExplicitOperatorMerge:true,
    baseRef:'main',
    finalRef:baseRef,
    finalCommit,
    completedCycles:cycles.filter(item=>item.status==='verified-and-carried-forward').length,
    nextCycle:cycleNumber,
    cycles,
    error,
    generatedAt:new Date().toISOString()
  });
}
async function main(){
  if(!repo)fail('GITHUB_REPOSITORY is required');
  if(totalMinutes<1)fail('invalid AutoBot total duration');
  const registry=readJson(path.join(root,'builder/brain/autobot-fleet.json'));
  if(registry?.enabled!==true||registry?.coordination?.mode!=='active')fail('fleet activation gate is not active');
  if(Number(registry?.coordination?.maxConcurrentWorkers||0)<2)fail('two specialist lanes are required');
  let baseRef=process.env.AUTOBOT_BASE_REF||'main';
  let cycleNumber=Number.parseInt(process.env.AUTOBOT_CYCLE_NUMBER||'1',10);
  const auditTrail=[];
  const cycleDurationsMs=[];
  let consecutiveNoProgressCycles=0;
  while(true){
    const remaining=remainingMs();
    const observedCycleMs=cycleDurationsMs.length?Math.max(...cycleDurationsMs):null;
    const estimatedCycleMs=observedCycleMs?Math.min(configuredCycleMinutes*60_000,Math.max(5*60_000,Math.ceil(observedCycleMs*1.5))):configuredCycleMinutes*60_000;
    const minimumRetryMs=5*60_000+safetyMinutes*60_000;
    if(remainingNormalMs()<minimumRetryMs){
      log(`stopping before cycle ${cycleNumber}: ${(remainingNormalMs()/60000).toFixed(1)}m remains, below the ${((minimumRetryMs)/60000).toFixed(1)}m minimum retry budget; finish grace is reserved for shutdown`);
      break;
    }
    const adaptiveCycleMs=Math.min(estimatedCycleMs,Math.max(minimumRetryMs,remainingNormalMs()-safetyMinutes*60_000));
    log(`cycle ${cycleNumber} launch budget: up to ${(adaptiveCycleMs/60000).toFixed(1)}m from ${cycleDurationsMs.length?`${cycleDurationsMs.length} observed cycle(s)`:'configured budget'}`);
    const cycleStartedMs=Date.now();
    try{
      baseRef=await cycle(cycleNumber,baseRef);
      const elapsedMs=Date.now()-cycleStartedMs;
      cycleDurationsMs.push(elapsedMs);
      consecutiveNoProgressCycles=0;
      auditTrail.push({cycle:cycleNumber,baseRef,elapsedMinutes:Number((elapsedMs/60000).toFixed(2)),status:'verified-and-carried-forward'});
      cycleNumber++;
      status(`NEXT CYCLE READY | cycle=${cycleNumber} | remaining=${(remainingMs()/60000).toFixed(1)}m`);
      writeJson(path.join(root,'builder','working','persistent-runtime-state.json'),{schemaVersion:1,status:'running',nextCycle:cycleNumber,baseRef,audit:auditTrail,normalDeadlineMs,hardDeadlineMs,finishGraceMinutes,consecutiveNoProgressCycles});
    }catch(error){
      const message=String(error?.message||error);
      consecutiveNoProgressCycles++;
      audit('cycle-failed',{cycle:cycleNumber,baseRef,error:message,consecutiveNoProgressCycles,remainingMinutes:Number((remainingMs()/60000).toFixed(2))});
      const failedElapsedMs=Date.now()-cycleStartedMs;
      auditTrail.push({cycle:cycleNumber,baseRef,elapsedMinutes:Number((failedElapsedMs/60000).toFixed(2)),status:'failed',error:message});
      writeJson(path.join(root,'builder','working','persistent-runtime-state.json'),{schemaVersion:1,status:'recovering',nextCycle:cycleNumber,baseRef,audit:auditTrail,normalDeadlineMs,hardDeadlineMs,finishGraceMinutes,error:message,consecutiveNoProgressCycles});
      if(consecutiveNoProgressCycles>=maxNoProgressCycles || remainingNormalMs() < minimumRetryMs){
        writeFinalHandoff({status:'blocked',baseRef,cycleNumber,audit:auditTrail,error:message});
        throw error;
      }
      status(`CYCLE ${cycleNumber} failed; preserving base ${baseRef} and replanning next cycle (${consecutiveNoProgressCycles}/${maxNoProgressCycles})`);
      cycleNumber++;
    }
  }
  // Preserve builder/working evidence so the final handoff can include the
  // actual QA/Reviewer artifacts from every verified cycle.
  checkoutBase(baseRef);
  writeJson(path.join(root,'builder','working','persistent-runtime-state.json'),{schemaVersion:1,status:'finished',nextCycle:cycleNumber,baseRef,audit:auditTrail,normalDeadlineMs,hardDeadlineMs,finishGraceMinutes,consecutiveNoProgressCycles});
  writeFinalHandoff({status:'ready-for-review',baseRef,cycleNumber,audit:auditTrail});
  status(`FINISHED | ${auditTrail.filter(x=>x.status==='verified-and-carried-forward').length} verified cycle(s) | final=${baseRef} | remaining=${(remainingMs()/60000).toFixed(1)}m`);
}
main().catch(error=>{console.error(`[autobot-persistent] FATAL: ${error.message}`);process.exit(1);});
