#!/usr/bin/env node
/**
 * GitHub Actions live mission-control summary for the persistent AutoBot.
 * Presentation-only: reads existing runtime evidence and never changes execution.
 */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const summaryPath=process.env.GITHUB_STEP_SUMMARY;
const runtimePath=path.join(root,'builder','working','persistent-runtime-state.json');

function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function minutes(ms){return Math.max(0,Number(ms||0)/60000);}
function pct(elapsed,total){if(!total||total<=0)return 0;return Math.max(0,Math.min(100,Math.round((elapsed/total)*100)));}
function bar(value,width=20){const filled=Math.round((Math.max(0,Math.min(100,value))/100)*width);return '█'.repeat(filled)+'░'.repeat(width-filled);}
function shortSha(value){return /^[0-9a-f]{40}$/i.test(String(value||''))?String(value).slice(0,10):String(value||'—');}

export function renderLiveSummary({stage='Starting',message='',cycle=null,baseRef=null}={}){
  if(!summaryPath)return;
  const runtime=readJson(runtimePath)||{};
  const startedMs=Number(process.env.AUTOBOT_RUN_STARTED_EPOCH_MS||Date.now());
  const totalMs=Number(runtime.normalDeadlineMs||0)-startedMs;
  const now=Date.now();
  const elapsedMs=Math.max(0,now-startedMs);
  const remainingMs=Math.max(0,Number(runtime.hardDeadlineMs||0)-now);
  const progress=pct(elapsedMs,totalMs);
  const audit=Array.isArray(runtime.audit)?runtime.audit:[];
  const completed=audit.filter(x=>x.status==='verified-and-carried-forward').length;
  const failed=audit.filter(x=>x.status==='failed').length;
  const activeCycle=cycle??runtime.nextCycle??'—';
  const activeBase=baseRef??runtime.baseRef??process.env.AUTOBOT_BASE_REF??'—';
  const status=runtime.status||'running';

  const lines=[
    '# 🤖 AutoBot Mission Control',
    '',
    '### '+stage,
    message?'> '+message:'> Persistent specialist lane is running.',
    '',
    '| Live | Value |',
    '|---|---|',
    '| **State** | '+status+' |',
    '| **Cycle** | '+activeCycle+' |',
    '| **Production workers** | 🟢 Director Builder + Timeline Builder |',
    '| **Production concurrency** | 2 workers |',
    '| **Current base / lineage** | `'+shortSha(activeBase)+'` |',
    '| **Completed verified cycles** | '+completed+' |',
    '| **Failed cycles observed** | '+failed+' |',
    '| **Elapsed** | '+minutes(elapsedMs).toFixed(1)+' min |',
    '| **Remaining** | '+minutes(remainingMs).toFixed(1)+' min |',
    '',
    '**Run progress:** '+bar(progress)+' **'+progress+'%**',
    '',
    '### 🔄 Production handoff',
    'Planner',
    '↓',
    'Director Builder  ║  Timeline Builder',
    '↓',
    'Repair / Recovery (only when required)',
    '↓',
    'Independent QA + Reviewer',
    '↓',
    'Verified candidate(s)',
    '↓',
    'Carry-forward → next cycle',
    '',
    '### 🧭 Current activity',
    '- '+(message||stage),
    '- Evolution Engineer: **observe-only / non-blocking**',
    '- Protected integration: **operator-controlled**',
    '',
    '### 📋 Cycle history',
    audit.length ? audit.map(item=>'- Cycle '+item.cycle+': **'+item.status+'** — '+(item.elapsedMinutes??'—')+' min').join('\n') : '- Waiting for the first completed cycle.',
    '',
    '_Updated '+new Date(now).toISOString()+'_'
  ];
  fs.mkdirSync(path.dirname(summaryPath),{recursive:true});
  fs.writeFileSync(summaryPath,lines.join('\n')+'\n');
}
