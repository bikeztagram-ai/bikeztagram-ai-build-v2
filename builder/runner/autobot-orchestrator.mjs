#!/usr/bin/env node
/** Central controller: select existing work, discover missing product work when needed, then hand off to a registered specialist. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const registryPath=path.join(root,'builder/brain/autobot-specialists.json');
const objectivePath=path.join(root,'builder/brain/feature-objectives.json');
const statePath=path.join(root,'builder/working/autobot-orchestration-state.json');
const builderStatePath=path.join(root,'builder/working/aider-feature-brain-state.json');
const discoveryPath=path.join(root,'builder/working/autobot-discovered-objective.json');
const run=process.env.AUTOBOT_ORCHESTRATOR_RUN||'1';
function json(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);}
function eligibleObjective(objectives,state,builderState){
  const done=new Set([...(state.completedObjectives||[]),...(builderState.completed||[])]);
  return objectives.filter(o=>o?.enabled!==false&&!done.has(o.id)&&(!o.dependsOn||o.dependsOn.every(d=>done.has(d)))).sort((a,b)=>(b.priority||0)-(a.priority||0))[0]||null;
}
function specialistFor(obj,registry){
  const wanted=Array.isArray(obj?.files)?new Set(obj.files):new Set();
  return registry.specialists.find(bot=>['proven','verified'].includes(bot.status)&&!['repair','qa','reviewer','self-improvement'].includes(bot.id)&&Array.isArray(bot.files)&&bot.files.some(f=>wanted.has(f)))||registry.specialists.find(bot=>bot.id==='builder'&&bot.status==='proven')||null;
}
function validateRegistry(registry){
  if(registry?.policy?.unknownBots!=='blocked'||registry?.policy?.protectedIntegration!==false)throw new Error('specialist registry safety policy invalid');
  for(const bot of registry.specialists||[]){if(!bot.id||!bot.entrypoint||!Array.isArray(bot.scope))throw new Error(`invalid specialist registry entry: ${bot.id||'unknown'}`);}
}
function invokeDiscovery(){
  const result=spawnSync(process.execPath,[path.join(root,'builder/runner/autobot-product-discovery.mjs')],{cwd:root,encoding:'utf8',stdio:'inherit',env:process.env});
  if(result.status!==0)throw new Error(`product discovery failed with status ${result.status??'error'}`);
  return json(discoveryPath,null);
}
function main(){
  const registry=json(registryPath,null);if(!registry)throw new Error('specialist registry missing');validateRegistry(registry);
  const library=json(objectivePath,{objectives:[]});const state=json(statePath,{version:1,completedObjectives:[],assignments:[],failures:[]});const builderState=json(builderStatePath,{completed:[]});
  let objective=eligibleObjective(library.objectives||[],state,builderState);let source='objective-library';
  if(!objective){objective=invokeDiscovery();source='product-discovery';if(!objective)throw new Error('discovery produced no objective');}
  const specialist=specialistFor(objective,registry);if(!specialist)throw new Error(`no trusted registered specialist matches objective: ${objective.title||objective.id}`);
  const objectiveId=objective.id||`discovered-${Date.now()}`;
  const assignment={run,assignedAt:new Date().toISOString(),source,objective:{id:objectiveId,title:objective.title,files:objective.files||[],acceptance:objective.acceptance||[],constraints:objective.constraints||[]},specialist:{id:specialist.id,status:specialist.status,trust:specialist.trust,entrypoint:specialist.entrypoint},execution:{worker:'builder/runner/aider-feature-brain.mjs',reason:'stage-1 controller proof keeps the already-proven execution worker; specialist entrypoints are routed only after their execution contracts are independently proven'}};
  state.lastAssignment=assignment;state.assignments=[...(state.assignments||[]),assignment].slice(-50);write(statePath,state);write(path.join(root,'builder/working/autobot-orchestrator-assignment.json'),assignment);
  console.log(JSON.stringify({ok:true,status:'assigned',source,objective:assignment.objective.title,specialist:specialist.id,trust:specialist.trust,executionWorker:assignment.execution.worker}));
}
main();
