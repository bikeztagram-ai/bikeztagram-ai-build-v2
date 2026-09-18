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
const statusPath=path.join(root,'builder','working','autobot-live-status.log');
function status(message){const line=`[${new Date().toISOString()}] ${message}`;console.log(`\\n${line}`);fs.mkdirSync(path.dirname(statusPath),{recursive:true});fs.appendFileSync(statusPath,line+'\\n');}

function parseDuration(v){
  const value=String(v).trim().toLowerCase();
  const hm=value.match(/^(\d+)h(?:(\d+)m)?$/);
  if(hm)return Number(hm[1])*60+Number(hm[2]||0);
  const m=value.match(/^(\\d+)\\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/);
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
function ensureClean(){run('git',['reset','--hard']);run('git',['clean','-fd','builder/working']);}
function checkoutBase(ref){
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
      AUTOBOT_AIDER_CALL_TIMEOUT_MS:'150000',
      AUTOBOT_FINISH_GRACE_MINUTES:'0',
      BUILDER_MAX_MINUTES:String(configuredCycleMinutes),
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
  status(`===== CYCLE ${cycleNumber} =====`);
  log(`base=${baseRef}; remaining=${(remainingMs()/60000).toFixed(1)}m; specialist budget=${configuredCycleMinutes}m`);
  ensureClean();checkoutBase(baseRef);
  fs.rmSync(path.join(root,'builder','working','persistent'),{recursive:true,force:true});
  run('node',['builder/runner/autobot-parallel-planner.mjs']);
  const plan=readJson(path.join(root,'builder','working','autobot-parallel-plan.json'));
  if(!plan?.workers||plan.workers.length<2)fail('parallel planner did not produce two specialist packages');
  status(`PLANNER complete | Director=${plan.workers.find(x=>x.botId==='director-builder')?.title||'missing'} | Timeline=${plan.workers.find(x=>x.botId==='timeline-builder')?.title||'missing'}`);
  status('SPECIALISTS starting in parallel | Director + Timeline');
  await runSpecialists(cycleNumber,plan);
  status('SPECIALISTS complete | candidate handoffs collected');
  status('REPAIR checking specialist failures');
  await runRepairs();
  status('REPAIR complete');
  status('QA + REVIEWER starting independent verification');
  const verified=await verifyCandidates(cycleNumber);
  status(`QA + REVIEWER complete | ${verified.filter(x=>x.check?.status==='pass').length}/${verified.length} passed`);
  const failures=verified.filter(x=>x.check?.status!=='pass');
  if(failures.length)fail(`independent candidate verification failed for: ${failures.map(x=>x.bot).join(', ')}`);
  status('CARRY-FORWARD integrating verified candidates');
  const nextRef=integrate(cycleNumber,baseRef,verified);
  status(`CYCLE ${cycleNumber} VERIFIED + CARRIED FORWARD | ${nextRef}`);
  return nextRef;
}

async function main(){
  if(!repo)fail('GITHUB_REPOSITORY is required');
  if(totalMinutes<1)fail('invalid AutoBot total duration');
  const registry=readJson(path.join(root,'builder/brain/autobot-fleet.json'));
  if(registry?.enabled!==true||registry?.coordination?.mode!=='active')fail('fleet activation gate is not active');
  if(Number(registry?.coordination?.maxConcurrentWorkers||0)<2)fail('two specialist lanes are required');
  let baseRef=process.env.AUTOBOT_BASE_REF||'main';
  let cycleNumber=Number.parseInt(process.env.AUTOBOT_CYCLE_NUMBER||'1',10);
  const audit=[];
  while(true){
    const remaining=remainingMs();
    const requiredStartMs=(configuredCycleMinutes+safetyMinutes)*60_000;
    if(remainingNormalMs()<requiredStartMs){
      log(`stopping before cycle ${cycleNumber}: ${(remainingNormalMs()/60000).toFixed(1)}m remains in normal budget, ${(requiredStartMs/60000).toFixed(1)}m required to start safely; finish grace is reserved for the active final cycle and shutdown only`);
      break;
    }
    try{
      const started=Date.now();
      baseRef=await cycle(cycleNumber,baseRef);
      audit.push({cycle:cycleNumber,baseRef,elapsedMinutes:Number(((Date.now()-started)/60000).toFixed(2)),status:'verified-and-carried-forward'});
      cycleNumber++;
      status(`NEXT CYCLE READY | cycle=${cycleNumber} | remaining=${(remainingMs()/60000).toFixed(1)}m`);
      writeJson(path.join(root,'builder','working','persistent-runtime-state.json'),{schemaVersion:1,status:'running',nextCycle:cycleNumber,baseRef,audit,normalDeadlineMs,hardDeadlineMs,finishGraceMinutes});
    }catch(error){
      writeJson(path.join(root,'builder','working','persistent-runtime-state.json'),{schemaVersion:1,status:'blocked',nextCycle:cycleNumber,baseRef,audit,normalDeadlineMs,hardDeadlineMs,finishGraceMinutes,error:String(error?.message||error)});
      throw error;
    }
  }
  ensureClean();
  checkoutBase(baseRef);
  writeJson(path.join(root,'builder','working','persistent-runtime-state.json'),{schemaVersion:1,status:'finished',nextCycle:cycleNumber,baseRef,audit,normalDeadlineMs,hardDeadlineMs,finishGraceMinutes});
  status(`FINISHED | ${audit.length} verified cycle(s) | final=${baseRef} | remaining=${(remainingMs()/60000).toFixed(1)}m`);
}
main().catch(error=>{console.error(`[autobot-persistent] FATAL: ${error.message}`);process.exit(1);});
