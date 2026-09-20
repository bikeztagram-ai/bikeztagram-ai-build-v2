#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const evidenceRoot=process.env.AUTOBOT_EVOLUTION_EVIDENCE_DIR||path.join(root,'builder','working','evolution-evidence');
const reportPath=process.env.AUTOBOT_EVOLUTION_REPORT||path.join(root,'builder','working','autobot-evolution-report.json');
const model=process.env.AUTOBOT_EVOLUTION_MODEL||'qwen2.5-coder:3b';
const host=(process.env.OLLAMA_HOST||'http://127.0.0.1:11435').replace(/\/$/,'');
const apply=String(process.env.AUTOBOT_EVOLUTION_APPLY||'false')==='true';
const protectedPaths=['src/','api/','public/','.github/workflows/autobot-parallel-specialists.yml','.github/workflows/autobot-endurance.yml','.github/workflows/autobot-endurance-cycle.yml','builder/runner/aider-feature-brain.mjs','builder/runner/autobot-persistent-cycle-engine.mjs','builder/runner/autobot-specialist-builder.mjs','builder/runner/autobot-specialist-recovery.mjs','scripts/autobot/verify-autobot-persistent-cycle.mjs','builder/brain/autobot-fleet.json'];
const allow=['builder/runner/autobot-evolution-engineer.mjs','scripts/autobot/verify-autobot-evolution-engineer.mjs','.github/workflows/autobot-evolution-engineer.yml','builder/brain/autobot-evolution-policy.json','builder/working/'];
const read=p=>{try{return fs.readFileSync(p,'utf8')}catch{return ''}};
const readJson=p=>{try{return JSON.parse(read(p))}catch{return {}}};
const run=(c,a)=>{try{return execFileSync(c,a,{encoding:'utf8',stdio:['ignore','pipe','pipe']})}catch{return ''}};
const git=a=>run('git',a).trim();
const ev={state:readJson(path.join(evidenceRoot,'persistent-runtime-state.json')),final:readJson(path.join(evidenceRoot,'autobot-final-handoff.json')),handoff:readJson(path.join(evidenceRoot,'autobot-specialist-handoff.json')),status:read(path.join(evidenceRoot,'autobot-live-status.log')).slice(-12000)};
const cycles=Array.isArray(ev.state.cycles)?ev.state.cycles:[];
const durations=cycles.map(c=>Number(c.durationMs||c.elapsedMs||0)).filter(n=>n>0);
const metrics={cyclesObserved:cycles.length,avgCycleMs:durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):0,maxCycleMs:durations.length?Math.max(...durations):0};
const raw=JSON.stringify(ev);
const hypotheses=[];
if(/timeout|timed out/i.test(raw))hypotheses.push({id:'evo-timeout-detection',priority:'high',title:'Improve timeout and stale-run detection',reason:'Production evidence contains timeout signals.',measurement:'time-to-detection and false-positive count'});
if(/no-progress|stale/i.test(raw))hypotheses.push({id:'evo-no-progress',priority:'high',title:'Improve no-progress detection',reason:'Production evidence contains no-progress or stale signals.',measurement:'cycles lost before detection'});
if(/failure|blocked|rejected/i.test(raw))hypotheses.push({id:'evo-failure-patterns',priority:'medium',title:'Improve recurring failure classification',reason:'Production evidence contains failure or blocked signals.',measurement:'repeat rate of identical failure classes'});
if(!hypotheses.length)hypotheses.push({id:'evo-observability',priority:'medium',title:'Increase AutoBot evidence coverage',reason:'No high-confidence recurring failure was found.',measurement:'required evidence fields present per run'});
let aiSummary='deterministic-evidence';
const before=git(['status','--porcelain']);
if(!apply&&process.env.AUTOBOT_EVOLUTION_USE_AI==='true'){try{const prompt='Return one sentence identifying the highest-value AutoBot reliability improvement. Never suggest product changes or weakening gates. Evidence: '+raw;const r=await fetch(host+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,messages:[{role:'user',content:prompt}],options:{num_ctx:2048,num_predict:80}})});if(r.ok){const j=await r.json();aiSummary=j.message?.content||j.response||aiSummary}}catch{}}
if(apply){
  const prompt='Make exactly one small reliability improvement to the AutoBot Evolution Engineer itself. Only edit builder/runner/autobot-evolution-engineer.mjs. Do not edit product source, production workflows, persistent engine, fleet registry, validators, or gates. Preserve the non-blocking design. Base the improvement on these hypotheses: '+JSON.stringify(hypotheses);
  run('aider',['--no-git','--yes-always','--message',prompt,'builder/runner/autobot-evolution-engineer.mjs']);
  const changed=git(['diff','--name-only']).split('\\n').filter(Boolean);
  const bad=changed.find(f=>!allow.some(p=>p.endsWith('/')?f.startsWith(p):f===p)||protectedPaths.some(p=>p.endsWith('/')?f.startsWith(p):f===p));
  if(bad){run('git',['reset','--hard']);run('git',['clean','-fd']);throw new Error('Evolution experiment violated scope: '+bad)}
}
const report={schemaVersion:'autobot-evolution-v1',generatedAt:new Date().toISOString(),mode:apply?'isolated-experiment-requested':'observe-and-propose',productionLane:{unchanged:true,blocking:false,workers:['director-builder','timeline-builder']},evidence:{metrics,handoff:!!ev.handoff,finalHandoff:!!ev.final,statusTail:ev.status.slice(-4000)},hypotheses,aiSummary,guardrails:{automaticMerge:false,productionDependency:false,protectedPaths,allow},experiment:{requested:apply,status:apply?'candidate-experiment-not-implemented-in-v1':'disabled-by-default',changedFiles:[]}};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ok:true,mode:report.mode,hypotheses:hypotheses.length,reportPath},null,2));