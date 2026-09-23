#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

const strategy=process.env.AUTOBOT_RESEARCH_STRATEGY||'aider-direct';
const maxCycles=Math.max(1,Number(process.env.AUTOBOT_RESEARCH_MAX_CYCLES||5));
const budgetMs=Math.max(60_000,Number(process.env.AUTOBOT_RESEARCH_LOOP_BUDGET_MS||20*60_000));
const minContinueMs=Math.max(10_000,Number(process.env.AUTOBOT_RESEARCH_MIN_CONTINUE_MS||5*60_000));
const trial=path.resolve('builder/runner/autobot-research-trial.mjs');
const variants={
  'aider-direct':['preflight source read + single-symbol edit','fresh context + exact function targeting','minimal prompt + explicit acceptance check','whole-file context + one-line semantic change'],
  'aider-diff':['map 256 + exact symbol','map 512 + refreshed source context','map 768 + acceptance-first prompt','diff with explicit no-prose acceptance'],
  'aider-udiff':['map 256 + symbol-first','map 512 + refreshed context','map 768 + acceptance-first','udiff with minimal-diff gate'],
  'aider-whole':['strict minimal diff','source preflight + whole-file edit','acceptance-first whole-file edit','whole-file edit with post-edit diff gate'],
  'aider-scoped':['exact function target','exact symbol + refreshed context','scoped target + acceptance gate','scoped target + no-unrelated-files instruction'],
  'aider-architect':['architect plan then editor','architect with dependency map','architect with acceptance-first execution','architect with minimal untouched surface'],
  'failure-replay':['bounded first attempt + recovery','shorter first timeout + udiff recovery','replay with explicit acceptance gate','replay with controller-only telemetry'],
  'performance-lab':['baseline validation overhead','larger validation sample','syntax vs behaviour timing split','repeat benchmark after warm runtime'],
  'shadow-architecture':['one bounded retry','retry only after failed QA','retry with explicit telemetry','retry with candidate identity check'],
  'adversarial':['ignore unrelated instructions + named target only','malicious-context resistance + acceptance','scope boundary + exact-file constraint','adversarial prompt with post-edit verification'],
  'fast-deep':['45s fast + 120s deep','30s fast + 120s deep','45s fast + 90s recovery','fast acceptance gate before deep escalation'],
  'challenger':['controller bottleneck hypothesis','model materialisation hypothesis','timeout boundary hypothesis','adapter invocation hypothesis'],
  'dependency-plan':['minimum file surface','dependency graph + untouched surface','risk-first target map','validation-first target map'],
  'direct-ollama-json':['structured JSON schema A','structured JSON schema B','JSON plan + acceptance fields','JSON plan + controller telemetry'],
  'openhands-sdk':['import/runtime smoke','SDK model construction','SDK workspace capability probe','SDK failure classification'],
  'deterministic-control':['repeat control baseline','control with syntax+behaviour checks','control with timing telemetry','control as regression baseline'],
  'evolution-selected':['retest latest hypothesis','hypothesis with acceptance gate','hypothesis with controller-vs-model split','hypothesis with recovery comparison']
};
const chosen=variants[strategy]||['bounded alternative A','bounded alternative B','bounded alternative C','bounded alternative D'];
const started=performance.now();
const cycles=[];
let previous=null;

for(let cycle=1;cycle<=maxCycles;cycle++){
  const elapsed=performance.now()-started;
  if(elapsed>=budgetMs) break;
  const remaining=budgetMs-elapsed;
  const variant=cycle===1?'baseline':chosen[(cycle-2)%chosen.length];
  const env={...process.env,AUTOBOT_RESEARCH_CYCLE:String(cycle),AUTOBOT_RESEARCH_VARIANT:variant};
  const t=performance.now();
  const r=spawnSync(process.execPath,[trial],{env,stdio:'inherit'});
  const durationMs=Math.round(performance.now()-t);
  let result={cycle,variant,exitCode:r.status,durationMs};
  try{
    const p=JSON.parse(fs.readFileSync(process.env.AUTOBOT_RESEARCH_RESULT||'autobot-research-result.json','utf8'));
    result={...p,cycle,variant,exitCode:r.status,durationMs};
  }catch{}
  cycles.push(result);
  previous=result;
  if(r.error) break;
  if(cycle>=maxCycles) break;
  if(remaining < minContinueMs) break;
  // A slow lane gets one bounded attempt; fast lanes spend the saved time on genuinely different variants.
  if(durationMs>=minContinueMs) break;
}

const successes=cycles.filter(x=>x.qualityPassed||x.status==='success').length;
const materialised=cycles.filter(x=>Number(x.diff)>0).length;
const out={
  schemaVersion:'autobot-research-loop-v1',
  strategy,
  cyclesRun:cycles.length,
  successCycles:successes,
  materialisationCycles:materialised,
  totalDurationMs:Math.round(performance.now()-started),
  budgetMs,
  cycles,
  lastResult:previous
};
fs.writeFileSync(process.env.AUTOBOT_RESEARCH_RESULT||'autobot-research-result.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
process.exit(0);
