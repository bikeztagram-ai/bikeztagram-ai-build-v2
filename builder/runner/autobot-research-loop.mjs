#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

const lane=process.env.AUTOBOT_RESEARCH_LANE||'unassigned';
const forcedStrategy=String(process.env.AUTOBOT_RESEARCH_STRATEGY||'').trim();
const maxCycles=Math.max(1,Number(process.env.AUTOBOT_RESEARCH_MAX_CYCLES||5));
const configuredBudgetMs=Math.max(60_000,Number(process.env.AUTOBOT_RESEARCH_LOOP_BUDGET_MS||20*60_000));
const deadlineMs=Math.max(0,Number(process.env.AUTOBOT_RESEARCH_DEADLINE_MS||0));
const remainingToDeadlineMs=deadlineMs>0?Math.max(0,deadlineMs-Date.now()):configuredBudgetMs;
const budgetMs=Math.min(configuredBudgetMs,remainingToDeadlineMs);
const minContinueMs=Math.max(10_000,Number(process.env.AUTOBOT_RESEARCH_MIN_CONTINUE_MS||120_000));
const maxExperimentsPerCycle=Math.max(1,Math.min(3,Number(process.env.AUTOBOT_RESEARCH_MAX_EXPERIMENTS_PER_CYCLE||2)));
const allowRevisits=String(process.env.AUTOBOT_RESEARCH_ALLOW_REVISITS||'true')!=='false';
const trial=path.resolve('builder/runner/autobot-research-trial.mjs');

const laneStrategies={
  'agent-materialisation':['aider-direct','aider-diff','aider-udiff','fast-deep','direct-ollama-json'],
  'edit-protocols':['aider-udiff','aider-whole','aider-scoped','aider-architect','aider-diff'],
  'recovery-engineering':['failure-replay','shadow-architecture','replay-known-failure','challenger','fast-deep'],
  'performance-runtime':['performance-lab','deterministic-control','runtime-alternatives','fast-deep','aider-direct'],
  'adversarial-quality':['adversarial','test-generation','contract-fuzz','dependency-plan','aider-scoped'],
  'architecture-controller':['shadow-architecture','workflow-architecture','agent-protocol','dependency-plan','challenger'],
  'model-adapters':['direct-ollama-json','openhands-sdk','model-crosscheck','aider-direct','aider-diff'],
  'evolution-discovery':['evolution-selected','worker-discovery','program-synthesis','challenger','replay-known-failure'],
  'forge-orchestration':['forge-orchestration','worker-discovery','workflow-architecture','memory-learning','agent-protocol'],
  'regression-replay':['deterministic-control','failure-replay','replay-known-failure','evolution-selected','performance-lab']
};
const variants=[
  'baseline with fresh context',
  'changed prompt framing and acceptance wording',
  'different edit protocol or runtime adapter',
  'repeat known approach with a new timeout/context budget',
  'cross-check against prior evidence and classify the failure stage'
];
const strategies=forcedStrategy?[forcedStrategy]:(laneStrategies[lane]||['aider-direct','deterministic-control','challenger','dependency-plan']);

const started=performance.now();
const experiments=[];
let previous=null;
let terminationReason=budgetMs<=0?'deadline-exhausted':'completed';

function runTrial(strategy,cycle,variantIndex){
  const variant=variants[(cycle+variantIndex-2)%variants.length];
  const env={...process.env,AUTOBOT_RESEARCH_STRATEGY:strategy,AUTOBOT_RESEARCH_CYCLE:String(cycle),AUTOBOT_RESEARCH_VARIANT:variant,AUTOBOT_RESEARCH_LANE:lane,AUTOBOT_RESEARCH_ALLOW_REVISITS:String(allowRevisits)};
  const t=performance.now();
  const r=spawnSync(process.execPath,[trial],{env,stdio:'inherit'});
  const durationMs=Math.round(performance.now()-t);
  let result={lane,cycle,strategy,variant,exitCode:r.status,durationMs};
  try{
    const p=JSON.parse(fs.readFileSync(process.env.AUTOBOT_RESEARCH_RESULT||'builder/working/autobot-research-result.json','utf8'));
    result={...p,lane,cycle,strategy,variant,exitCode:r.status,durationMs};
  }catch{}
  if(r.error) result.controllerError=String(r.error.message||r.error);
  return result;
}

for(let cycle=1;cycle<=maxCycles;cycle++){
  const elapsed=performance.now()-started;
  if(elapsed>=budgetMs) break;
  const remaining=budgetMs-elapsed;
  const first=strategies[(cycle-1)%strategies.length];
  const selected=[first];
  if(maxExperimentsPerCycle>1 && strategies.length>1){
    const second=strategies[(cycle)%strategies.length];
    if(second!==first) selected.push(second);
  }
  for(let i=0;i<selected.length;i++){
    if(performance.now()-started>=budgetMs) break;
    const result=runTrial(selected[i],cycle,i);
    experiments.push(result);
    previous=result;
    if(performance.now()-started>=budgetMs) {
      terminationReason='budget-exhausted';
      break;
    }
    if(result.durationMs>=minContinueMs) {
      terminationReason='bounded-slow-attempt';
      break;
    }
  }
  if(terminationReason!=='completed') break;
  if(performance.now()-started>=budgetMs) {
    terminationReason='budget-exhausted';
    break;
  }
  if(cycle>=maxCycles) {
    terminationReason='max-cycles';
    break;
  }
  if((budgetMs-(performance.now()-started))<minContinueMs) {
    terminationReason='insufficient-time-for-next-attempt';
    break;
  }
}

const successes=experiments.filter(x=>x.qualityPassed||x.status==='success').length;
const materialised=experiments.filter(x=>Number(x.diff)>0).length;
const failures=experiments.filter(x=>!(x.qualityPassed||x.status==='success')).length;
const out={
  schemaVersion:'autobot-research-loop-v2',
  lane,
  strategies,
  terminationReason,
  forcedStrategy:forcedStrategy||null,
  allowRevisits,
  cyclesRun:experiments.length?Math.max(...experiments.map(x=>Number(x.cycle||0))):0,
  experimentsRun:experiments.length,
  successExperiments:successes,
  materialisationExperiments:materialised,
  failedExperiments:failures,
  totalDurationMs:Math.round(performance.now()-started),
  budgetMs,
  configuredBudgetMs,
  deadlineMs: deadlineMs||null,
  remainingToDeadlineMs,
  maxExperimentsPerCycle,
  experiments,
  lastResult:previous
};
fs.writeFileSync(process.env.AUTOBOT_RESEARCH_RESULT||'autobot-research-result.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
process.exit(0);
