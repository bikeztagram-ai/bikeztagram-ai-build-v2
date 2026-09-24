#!/usr/bin/env node
import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync(process.env.AUTOBOT_RESEARCH_CATALOG||'builder/brain/autobot-research-catalog.json','utf8'));
const planPath=process.env.AUTOBOT_RESEARCH_PLAN||'builder/brain/autobot-research-plan.json';
let plan={}; try{plan=JSON.parse(fs.readFileSync(planPath,'utf8'));}catch{}
const priorPath=process.env.AUTOBOT_PRIOR_RESEARCH||'builder/working/prior-research/autobot-research-next-cycle.json';
let prior={}; try{prior=JSON.parse(fs.readFileSync(priorPath,'utf8'));}catch{}

const tasks=[];
const variants=catalog.variants||[];
const domains=catalog.domains||[];
const retests=new Map();
for(const target of (prior.retestTargets||[])){
  if(target.lane&&!retests.has(target.lane)) retests.set(target.lane,target);
}
const ideas=new Map();
for(const idea of (prior.candidateWorkerIdeas||[])){
  if(idea.lane&&!ideas.has(idea.lane)) ideas.set(idea.lane,idea);
}

for(let i=0;i<domains.length;i++){
  const domain=domains[i];
  const retest=retests.get(domain.id);
  const idea=ideas.get(domain.id);
  let question;
  let variant;
  if(retest){
    question=`Retest the previous ${retest.failureClass||'failed'} result for ${domain.id}, change one meaningful variable, and classify whether the failure reproduces or improves.`;
    variant=retest.variant||'cross-check-prior-evidence';
  }else if(idea){
    question=`Benchmark the prior worker/controller idea for ${domain.id}: ${idea.note||'define a falsifiable experiment and acceptance check'}`;
    variant='fresh-context';
  }else{
    const qs=domain.questions||[];
    question=qs[i%Math.max(1,qs.length)]||`Run falsifiable research experiments for ${domain.id} and record materialisation, quality, scope and recovery outcomes.`;
    variant=variants[i%Math.max(1,variants.length)]||'fresh-context';
  }
  tasks.push({
    slot:'r'+String(i+1).padStart(3,'0'),
    experiment_id:'forge-lane-'+domain.id,
    domain:domain.id,
    strategy:'',
    research_question:question,
    variant
  });
}

const matrix=JSON.stringify({include:tasks});
fs.appendFileSync(process.env.GITHUB_OUTPUT,'matrix='+matrix.replace(/%/g,'%25').replace(/\n/g,'%0A').replace(/\r/g,'%0D')+'\n');
fs.mkdirSync('builder/working',{recursive:true});
fs.writeFileSync(
  'builder/working/research-matrix.json',
  JSON.stringify({
    schemaVersion:'forge-research-matrix-v3-persistent-lanes',
    generatedAt:new Date().toISOString(),
    taskCount:tasks.length,
    persistentLaneCount:tasks.length,
    priorEvidenceLoaded:Object.keys(prior).length>0,
    tasks
  },null,2)+'\n'
);
console.log(JSON.stringify({
  taskCount:tasks.length,
  persistentLaneCount:tasks.length,
  priorEvidenceLoaded:Object.keys(prior).length>0,
  domains:tasks.map(x=>x.domain)
},null,2));