#!/usr/bin/env node
import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync(process.env.AUTOBOT_RESEARCH_CATALOG||'builder/brain/autobot-research-catalog.json','utf8'));
const planPath=process.env.AUTOBOT_RESEARCH_PLAN||'builder/brain/autobot-research-plan.json';
let plan={}; try{plan=JSON.parse(fs.readFileSync(planPath,'utf8'));}catch{}
const priorPath=process.env.AUTOBOT_PRIOR_RESEARCH||'builder/working/prior-research/autobot-research-next-cycle.json';
let prior={}; try{prior=JSON.parse(fs.readFileSync(priorPath,'utf8'));}catch{}

const max=Math.min(120,Math.max(30,Number(catalog.maxTasksPerRun||120)));
const variants=catalog.variants||[];
const tasks=[],seen=new Set();
let index=0;

function addTask(task){
  if(tasks.length>=max) return false;
  const key=[task.domain,task.strategy,task.research_question,task.variant].join('|');
  if(seen.has(key)) return false;
  seen.add(key);
  tasks.push({
    slot:'r'+String(tasks.length+1).padStart(3,'0'),
    experiment_id:'forge-'+String(tasks.length+1).padStart(3,'0'),
    domain:task.domain,
    strategy:task.strategy,
    research_question:task.research_question,
    variant:task.variant
  });
  return true;
}

// Carry unfinished/high-value evidence forward first. This makes the next run
// an evidence-driven continuation rather than a fresh random matrix.
for(const target of (prior.retestTargets||[])){
  if(!target.lane||!target.strategy) continue;
  addTask({
    domain:target.lane,
    strategy:target.strategy,
    research_question:`Retest the previous ${target.failureClass||'failed'} result and change one meaningful variable while preserving the same acceptance checks.`,
    variant:target.variant||'cross-check-prior-evidence'
  });
}
for(const idea of (prior.candidateWorkerIdeas||[])){
  if(!idea.lane||!idea.strategy) continue;
  addTask({
    domain:idea.lane,
    strategy:idea.strategy,
    research_question:`Benchmark the proposed worker/controller idea from prior evidence: ${idea.note||'define a falsifiable worker experiment'}`,
    variant:'fresh-context'
  });
}

// Fill the remainder with broad catalog coverage. Twenty passes gives the
// director enough combinations to reach the 120-task cap across the ten domains.
for(let pass=0;tasks.length<max && pass<20;pass++){
  for(const domain of catalog.domains){
    const strategies=domain.strategies||[], questions=domain.questions||[];
    if(!strategies.length||!questions.length) continue;
    const strategy=strategies[(pass+index)%strategies.length];
    const question=questions[(pass+index*2)%questions.length];
    const variant=variants[(pass+index)%variants.length]||'fresh-context';
    addTask({domain:domain.id,strategy,research_question:question,variant});
    index++;
    if(tasks.length>=max) break;
  }
}

const matrix=JSON.stringify({include:tasks});
fs.appendFileSync(process.env.GITHUB_OUTPUT,'matrix='+matrix.replace(/%/g,'%25').replace(/\n/g,'%0A').replace(/\r/g,'%0D')+'\n');
fs.mkdirSync('builder/working',{recursive:true});
fs.writeFileSync(
  'builder/working/research-matrix.json',
  JSON.stringify({
    schemaVersion:'forge-research-matrix-v2',
    generatedAt:new Date().toISOString(),
    taskCount:tasks.length,
    priorEvidenceLoaded:Object.keys(prior).length>0,
    tasks
  },null,2)+'\n'
);
console.log(JSON.stringify({
  taskCount:tasks.length,
  priorEvidenceLoaded:Object.keys(prior).length>0,
  domains:[...new Set(tasks.map(x=>x.domain))],
  strategies:[...new Set(tasks.map(x=>x.strategy))]
},null,2));
