#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

const lane=process.env.AUTOBOT_RESEARCH_LANE||'unassigned';
const forcedStrategy=String(process.env.AUTOBOT_RESEARCH_STRATEGY||'').trim();
const maxCycles=Math.max(1,Number(process.env.AUTOBOT_RESEARCH_MAX_CYCLES||1000000));
const configuredBudgetMs=Math.max(60_000,Number(process.env.AUTOBOT_RESEARCH_LOOP_BUDGET_MS||330*60_000));
const deadlineMs=Math.max(0,Number(process.env.AUTOBOT_RESEARCH_DEADLINE_MS||0));
const remainingToDeadlineMs=deadlineMs>0?Math.max(0,deadlineMs-Date.now()):configuredBudgetMs;
const budgetMs=Math.min(configuredBudgetMs,remainingToDeadlineMs);
const minContinueMs=Math.max(10_000,Number(process.env.AUTOBOT_RESEARCH_MIN_CONTINUE_MS||120_000));
const maxExperimentsPerCycle=Math.max(1,Math.min(3,Number(process.env.AUTOBOT_RESEARCH_MAX_EXPERIMENTS_PER_CYCLE||2)));
const allowRevisits=String(process.env.AUTOBOT_RESEARCH_ALLOW_REVISITS||'true')!=='false';
const baseExperimentId=String(process.env.AUTOBOT_RESEARCH_EXPERIMENT_ID||'').trim();
const baseQuestion=String(process.env.AUTOBOT_RESEARCH_QUESTION||'').trim();
const requestedVariant=String(process.env.AUTOBOT_RESEARCH_VARIANT||'').trim();
const queueSlot=String(process.env.AUTOBOT_RESEARCH_QUEUE_SLOT||'').trim();
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
let terminationReason=budgetMs<=0?'deadline-exhausted':'deadline-active';
let experimentOrdinal=0;

function remainingBudget(){
  return Math.max(0,Math.min(
    budgetMs-(performance.now()-started),
    deadlineMs>0?deadlineMs-Date.now():Number.POSITIVE_INFINITY
  ));
}
function makeExperimentId(cycle,attempt){
  const root=baseExperimentId||`forge-${lane}-${queueSlot||'persistent'}`;
  return `${root}-c${String(cycle).padStart(4,'0')}-e${String(attempt).padStart(3,'0')}`;
}
function makeVariant(cycle,variantIndex){
  if(cycle===1 && variantIndex===0 && requestedVariant) return requestedVariant;
  return variants[(cycle+variantIndex-2)%variants.length];
}
function makeQuestion(cycle,strategy,variant){
  const root=baseQuestion||`Test the ${strategy} path for ${lane} and classify materialisation, controller, quality and scope outcomes.`;
  return `${root} Controlled variation for cycle ${cycle}: ${variant}.`;
}
function runTrial(strategy,cycle,variantIndex){
  experimentOrdinal+=1;
  const variant=makeVariant(cycle,variantIndex);
  const experimentId=makeExperimentId(cycle,experimentOrdinal);
  const researchQuestion=makeQuestion(cycle,strategy,variant);
  const env={
    ...process.env,
    AUTOBOT_RESEARCH_STRATEGY:strategy,
    AUTOBOT_RESEARCH_CYCLE:String(cycle),
    AUTOBOT_RESEARCH_VARIANT:variant,
    AUTOBOT_RESEARCH_LANE:lane,
    AUTOBOT_RESEARCH_ALLOW_REVISITS:String(allowRevisits),
    AUTOBOT_RESEARCH_EXPERIMENT_ID:experimentId,
    AUTOBOT_RESEARCH_QUESTION:researchQuestion,
    AUTOBOT_RESEARCH_QUEUE_SLOT:queueSlot
  };
  const remaining=Math.max(1,Math.floor(remainingBudget()));
  const trialTimeoutMs=Math.max(1000,Math.min(minContinueMs,remaining));
  const t=performance.now();
  const r=spawnSync(process.execPath,[trial],{
    env,
    stdio:'inherit',
    timeout:trialTimeoutMs,
    killSignal:'SIGTERM'
  });
  const durationMs=Math.round(performance.now()-t);
  let result={lane,cycle,strategy,variant,experimentId,researchQuestion,queueSlot,exitCode:r.status,durationMs};
  if(r.error){
    result.controllerError=String(r.error.message||r.error);
    result.timedOut=Boolean(r.error.code==='ETIMEDOUT'||/timed out/i.test(String(r.error.message||'')));
  }
  try{
    const p=JSON.parse(fs.readFileSync(process.env.AUTOBOT_RESEARCH_RESULT||'builder/working/autobot-research-result.json','utf8'));
    result={
      ...p,
      lane,cycle,strategy,variant,experimentId,researchQuestion,queueSlot,
      exitCode:r.status,durationMs,
      ...(r.error?{
        controllerError:String(r.error.message||r.error),
        timedOut:Boolean(r.error.code==='ETIMEDOUT'||/timed out/i.test(String(r.error.message||'')))
      }:{})
    };
  }catch{}
  return result;
}

for(let cycle=1;cycle<=maxCycles;cycle++){
  if(remainingBudget()<=0){terminationReason='deadline-exhausted';break;}
  const first=strategies[(cycle-1)%strategies.length];
  const selected=[first];
  if(maxExperimentsPerCycle>1 && strategies.length>1){
    const second=strategies[cycle%strategies.length];
    if(second!==first) selected.push(second);
  }
  for(let i=0;i<selected.length;i++){
    if(remainingBudget()<=0){terminationReason='deadline-exhausted';break;}
    const result=runTrial(selected[i],cycle,i);
    experiments.push(result);
    previous=result;
    if(remainingBudget()<=0){terminationReason='deadline-exhausted';break;}
    if(result.timedOut || result.durationMs>=minContinueMs){
      console.log(`Bounded experiment ${result.experimentId}; continuing the persistent lane.`);
      continue;
    }
  }
  if(remainingBudget()<=0){terminationReason='deadline-exhausted';break;}
}
if(terminationReason==='deadline-active') terminationReason='max-cycles';

const successes=experiments.filter(x=>x.qualityPassed||x.status==='success').length;
const materialised=experiments.filter(x=>Number(x.diff)>0).length;
const failures=experiments.filter(x=>!(x.qualityPassed||x.status==='success')).length;
const out={
  schemaVersion:'autobot-research-loop-v4',
  lane,strategies,terminationReason,forcedStrategy:forcedStrategy||null,allowRevisits,
  queueSlot:queueSlot||null,rootExperimentId:baseExperimentId||null,
  rootResearchQuestion:baseQuestion||null,requestedVariant:requestedVariant||null,
  cyclesRun:experiments.length?Math.max(...experiments.map(x=>Number(x.cycle||0))):0,
  experimentsRun:experiments.length,successExperiments:successes,
  materialisationExperiments:materialised,failedExperiments:failures,
  totalDurationMs:Math.round(performance.now()-started),budgetMs,configuredBudgetMs,
  deadlineMs:deadlineMs||null,remainingToDeadlineMs:remainingBudget(),
  maxCycles,maxExperimentsPerCycle,experiments,lastResult:previous
};
fs.writeFileSync(process.env.AUTOBOT_RESEARCH_RESULT||'autobot-research-result.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
process.exit(0);