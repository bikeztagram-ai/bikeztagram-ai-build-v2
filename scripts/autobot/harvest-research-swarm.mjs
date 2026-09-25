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
const MAX_RETAINED_EXPERIMENTS=2000;
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
const normalizeSignalText=value=>String(value??'')
  .toLowerCase()
  .replace(/\d+/g,'#')
  .replace(/\s+/g,' ')
  .trim();
const signalClass=x=>classify(x);
const signalSignature=x=>[
  x.lane||'unknown',
  x.strategy||'unknown',
  signalClass(x),
  Number(x.diff||0)>0?'materialised':'no-materialisation',
  normalizeSignalText(x.variant),
  normalizeSignalText(x.note)
].join('|');
const signalClusters=new Map();
for(const x of experiments){
  const key=signalSignature(x);
  const cluster=signalClusters.get(key)||{signature:key,count:0,successes:0,examples:[]};
  cluster.count+=1;
  if(x.qualityPassed||x.status==='success') cluster.successes+=1;
  if(cluster.examples.length<5) cluster.examples.push(x);
  signalClusters.set(key,cluster);
}
const topSignals=[...signalClusters.values()]
  .sort((a,b)=>((b.successes>0?1:0)-(a.successes>0?1:0)) || b.count-a.count)
  .slice(0,40)
  .map(c=>({
    signature:c.signature,
    repeatCount:c.count,
    successfulCount:c.successes,
    reproduced:c.count>=2,
    lane:c.examples[0]?.lane||null,
    strategy:c.examples[0]?.strategy||null,
    variant:c.examples[0]?.variant||null,
    failureClass:signalClass(c.examples[0]||{}),
    diff:c.examples[0]?.diff||0,
    durationMs:c.examples[0]?.durationMs||0,
    note:c.examples[0]?.note||null
  }));
const reproducedSuccessfulSignals=topSignals.filter(x=>x.reproduced&&x.successfulCount>0);
const retainedExperiments=experiments.slice(-MAX_RETAINED_EXPERIMENTS);
const promising=reproducedSuccessfulSignals
  .filter(x=>Number(x.diff||0)>0)
  .sort((a,b)=>b.repeatCount-a.repeatCount || b.successfulCount-a.successfulCount)
  .slice(0,30);

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
    truncated:experiments.length>MAX_RETAINED_EXPERIMENTS,
    uniqueSignalSignatures:signalClusters.size,
    duplicateExperiments:Math.max(0,experiments.length-signalClusters.size),
    reproducedSuccessfulSignals:reproducedSuccessfulSignals.length
  },
  byLane,
  byStrategy,
  byFailureClass:byClass,
  topSignals,
  promising,
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
  topSignals:topSignals.slice(0,20),
  candidateWorkerIdeas:reproducedSuccessfulSignals
    .filter(x=>/worker|borg|program|architecture|protocol|runtime/i.test(x.signature))
    .slice(0,20)
    .map(x=>({lane:x.lane,strategy:x.strategy,note:x.note||null,repeatCount:x.repeatCount,reproductionStatus:x.reproduced?'reproduced':'single'})),
  retestTargets:topSignals
    .filter(x=>x.successfulCount===0)
    .slice(0,30)
    .map(x=>({lane:x.lane,strategy:x.strategy,variant:x.variant,failureClass:x.failureClass,repeatCount:x.repeatCount,reproduced:x.reproduced})),
  productionHandoff:{
    purpose:'Advisory evidence for the next ten-specialist production cycle.',
    promising:promising.slice(0,12),
    topSignals:topSignals.slice(0,12),
    candidateWorkerIdeas:reproducedSuccessfulSignals
      .filter(x=>/worker|borg|program|architecture|protocol|runtime/i.test(x.signature))
      .slice(0,12)
      .map(x=>({lane:x.lane,strategy:x.strategy,note:x.note||null,repeatCount:x.repeatCount,reproductionStatus:x.reproduced?'reproduced':'single'})),
    retestTargets:topSignals
      .filter(x=>x.successfulCount===0)
      .slice(0,20)
      .map(x=>({lane:x.lane,strategy:x.strategy,variant:x.variant,failureClass:x.failureClass,repeatCount:x.repeatCount,reproduced:x.reproduced})),
    failureClasses:byClass
  }
};
fs.writeFileSync(path.join(outRoot,'autobot-research-next-cycle.json'),JSON.stringify(nextCycle,null,2)+'\n');
console.log(JSON.stringify({ok:true,lanes:harvest.totals.lanes,experiments:harvest.totals.experiments,successful:harvest.totals.successful,failed:harvest.totals.failed,byFailureClass:byClass},null,2));
