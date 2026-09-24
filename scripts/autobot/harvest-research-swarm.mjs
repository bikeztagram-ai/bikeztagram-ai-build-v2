#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const rawRoot=path.join(root,'builder','working','research-harvest','raw');
const outRoot=path.join(root,'builder','working','research-harvest');
fs.mkdirSync(outRoot,{recursive:true});

function walk(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const files=walk(rawRoot).filter(p=>p.endsWith('.json'));
const experiments=[];
const sources=[];
for(const file of files){
  try{
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    sources.push({file:path.relative(root,file),lane:data.lane||null,experimentsRun:data.experimentsRun||0});
    if(Array.isArray(data.experiments)) experiments.push(...data.experiments.map(x=>({...x,source:path.relative(root,file)})));
  }catch{}
}

const classify=(x)=>{
  const text=JSON.stringify(x).toLowerCase();
  if(x.qualityPassed||x.status==='success') return 'success';
  if(/timeout|timed out/.test(text)) return 'timeout';
  if(/no.?diff|materiali[sz]ation/.test(text) && Number(x.diff||0)===0) return 'no-materialisation';
  if(/network|connection|ollama|adapter|sdk/.test(text)) return 'adapter-or-runtime';
  if(/syntax/.test(text)) return 'syntax';
  if(/scope|export|contract/.test(text)) return 'contract-or-scope';
  return 'other';
};

const byLane={},byStrategy={},byClass={};
for(const x of experiments){
  const lane=x.lane||'unknown';
  const strategy=x.strategy||'unknown';
  const cls=classify(x);
  byLane[lane]=(byLane[lane]||0)+1;
  byStrategy[strategy]=(byStrategy[strategy]||0)+1;
  byClass[cls]=(byClass[cls]||0)+1;
}
const successful=experiments.filter(x=>x.qualityPassed||x.status==='success');
const MAX_RETAINED_EXPERIMENTS=2000;
const retainedExperiments=experiments.slice(-MAX_RETAINED_EXPERIMENTS);
const normalise=(value)=>String(value??'').toLowerCase().replace(/\s+/g,' ').trim();
const signature=(x)=>[
  x.lane||'unknown',x.strategy||'unknown',x.variant||'unknown',x.status||'',
  x.qualityPassed?'quality-pass':'quality-fail',Number(x.diff||0),normalise(x.note),normalise(x.error)
].join('|');
const groups=new Map();
for(const x of experiments){
  const key=signature(x);
  const g=groups.get(key)||{representative:x,count:0,cycles:[],durations:[],sources:new Set()};
  g.count+=1;
  if(x.cycle!=null) g.cycles.push(x.cycle);
  if(Number.isFinite(Number(x.durationMs))) g.durations.push(Number(x.durationMs));
  if(x.source) g.sources.add(x.source);
  groups.set(key,g);
}
const clustered=[...groups.values()].map(g=>({
  lane:g.representative.lane||null,
  strategy:g.representative.strategy||null,
  variant:g.representative.variant||null,
  status:g.representative.status||null,
  qualityPassed:!!g.representative.qualityPassed,
  diff:Number(g.representative.diff||0),
  note:g.representative.note||null,
  error:g.representative.error||null,
  occurrences:g.count,
  cycles:g.cycles.slice(-8),
  medianDurationMs:g.durations.length?g.durations.sort((a,b)=>a-b)[Math.floor(g.durations.length/2)]:0,
  sources:[...g.sources].slice(0,4)
}));
const novelSignals=clustered.sort((a,b)=>(b.occurrences-a.occurrences)||(b.diff-a.diff));
const promising=clustered.filter(x=>x.qualityPassed&&x.diff>0)
  .sort((a,b)=>(b.occurrences-a.occurrences)||(b.diff-a.diff))
  .slice(0,30)
  .map(x=>({
    lane:x.lane,
    strategy:x.strategy,
    variant:x.variant,
    occurrences:x.occurrences,
    medianDurationMs:x.medianDurationMs,
    diff:x.diff,
    note:x.note
  }));

const harvest={
  schemaVersion:'autobot-research-harvest-v1',
  generatedAt:new Date().toISOString(),
  purpose:'Disposable research evidence for improving future AutoBots. Research never edits production files.',
  sources,
  totals:{
    lanes:Object.keys(byLane).length,
    experiments:experiments.length,
    successful:successful.length,
    failed:experiments.length-successful.length,
    materialised:experiments.filter(x=>Number(x.diff)>0).length,
    retainedExperiments:retainedExperiments.length,
    truncated:experiments.length>MAX_RETAINED_EXPERIMENTS
  },
  byLane,
  byStrategy,
  byFailureClass:byClass,
  uniqueSignatures:clustered.length,
  duplicateExperiments:Math.max(0,experiments.length-clustered.length),
  promising,
  topSignals:novelSignals.slice(0,40),
  experiments:retainedExperiments
};
fs.writeFileSync(path.join(outRoot,'autobot-research-harvest.json'),JSON.stringify(harvest,null,2)+'\n');

const nextCycle={
  schemaVersion:'autobot-research-next-cycle-v2',
  generatedAt:harvest.generatedAt,
  rules:[
    'Keep all ten production Bikeztagram specialists isolated and protected.',
    'Re-test useful ideas even when previously tested; change one meaningful variable and record the delta.',
    'Prioritise experiments that distinguish controller failure, model failure, materialisation failure, QA failure, scope failure and infrastructure failure.',
    'Promote no research result directly into production; require evidence, QA and human-reviewed integration.',
    'Successful research is queued for the NEXT production cycle; it never blocks or mutates the CURRENT production cycle.',
    'Production specialists must treat this handoff as advisory evidence, validate it against current source and reject unsupported claims.'
  ],
  observedFailureClasses:byClass,
  highValueStrategies:Object.entries(byStrategy).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([strategy,count])=>({strategy,count})),
  signalQuality:{uniqueSignatures:clustered.length,duplicateExperiments:Math.max(0,experiments.length-clustered.length)},
  candidateWorkerIdeas:clustered.filter(x=>x.qualityPassed&&/worker|borg|program|architecture|protocol|runtime/i.test(JSON.stringify(x))).slice(0,20).map(x=>({lane:x.lane,strategy:x.strategy,variant:x.variant,occurrences:x.occurrences,note:x.note})),
  retestTargets:clustered.filter(x=>!x.qualityPassed).sort((a,b)=>b.occurrences-a.occurrences).slice(0,30).map(x=>({lane:x.lane,strategy:x.strategy,variant:x.variant,failureClass:x.status==='timeout'?'timeout':x.status==='success'?'success':classify(x),occurrences:x.occurrences,error:x.error||null})),
  productionHandoff:{
    purpose:'Advisory evidence for the next ten-specialist production cycle.',
    promising:promising.slice(0,12),
    candidateWorkerIdeas:clustered.filter(x=>x.qualityPassed&&/worker|borg|program|architecture|protocol|runtime/i.test(JSON.stringify(x))).slice(0,12).map(x=>({lane:x.lane,strategy:x.strategy,variant:x.variant,occurrences:x.occurrences,note:x.note})),
    retestTargets:clustered.filter(x=>!x.qualityPassed).sort((a,b)=>b.occurrences-a.occurrences).slice(0,20).map(x=>({lane:x.lane,strategy:x.strategy,variant:x.variant,failureClass:classify(x),occurrences:x.occurrences,error:x.error||null})),
    failureClasses:byClass,
    signalQuality:{uniqueSignatures:clustered.length,duplicateExperiments:Math.max(0,experiments.length-clustered.length)},
    topSignals:novelSignals.slice(0,20)
  }
};
fs.writeFileSync(path.join(outRoot,'autobot-research-next-cycle.json'),JSON.stringify(nextCycle,null,2)+'\n');
console.log(JSON.stringify({ok:true,lanes:harvest.totals.lanes,experiments:harvest.totals.experiments,successful:harvest.totals.successful,failed:harvest.totals.failed,byFailureClass:byClass},null,2));
