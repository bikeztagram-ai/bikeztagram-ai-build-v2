#!/usr/bin/env node
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync(process.env.AUTOBOT_RESEARCH_CATALOG||'builder/brain/autobot-research-catalog.json','utf8'));
const planPath=process.env.AUTOBOT_RESEARCH_PLAN||'builder/brain/autobot-research-plan.json';
let plan={}; try{plan=JSON.parse(fs.readFileSync(planPath,'utf8'));}catch{}
const max=Math.min(120,Math.max(30,Number(catalog.maxTasksPerRun||120)));
const variants=catalog.variants||[], tasks=[], seen=new Set(); let index=0;
for(let pass=0;tasks.length<max && pass<4;pass++) for(const domain of catalog.domains){
 const strategies=domain.strategies||[], questions=domain.questions||[]; if(!strategies.length||!questions.length) continue;
 const strategy=strategies[(pass+index)%strategies.length], question=questions[(pass+index*2)%questions.length], variant=variants[(pass+index)%variants.length]||'fresh-context';
 const key=[domain.id,strategy,question,variant,pass].join('|'); if(seen.has(key)) continue; seen.add(key);
 tasks.push({slot:'r'+String(tasks.length+1).padStart(3,'0'),experiment_id:'forge-'+String(tasks.length+1).padStart(3,'0'),domain:domain.id,strategy,research_question:question,variant});
 index++; if(tasks.length>=max) break;
}
const matrix=JSON.stringify({include:tasks});
fs.appendFileSync(process.env.GITHUB_OUTPUT,'matrix='+matrix.replace(/%/g,'%25').replace(/\n/g,'%0A').replace(/\r/g,'%0D')+'\n');
fs.mkdirSync('builder/working',{recursive:true});
fs.writeFileSync('builder/working/research-matrix.json',JSON.stringify({schemaVersion:'forge-research-matrix-v1',generatedAt:new Date().toISOString(),taskCount:tasks.length,tasks},null,2)+'\n');
console.log(JSON.stringify({taskCount:tasks.length,domains:[...new Set(tasks.map(x=>x.domain))],strategies:[...new Set(tasks.map(x=>x.strategy))]},null,2));
