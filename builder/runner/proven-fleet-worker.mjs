#!/usr/bin/env node
/** Run the proven long-run AutoBot against one isolated fleet work package. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const packagePath=path.resolve(process.env.AUTOBOT_WORK_PACKAGE_PATH||'builder/working/autobot-proven-package.json');
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
if(pkg.schemaVersion!==1||!Array.isArray(pkg.tasks)||pkg.tasks.length===0) throw new Error('Invalid proven fleet work package.');
if(!pkg.workerId) throw new Error('Proven fleet work package is missing workerId.');

const files=['builder/brain/task-library.json','builder/brain/roadmap.json','config/autonomous-builder-queue.json'];
const backups=files.map(file=>({file,content:fs.readFileSync(path.join(root,file),'utf8')}));
function restore(){for(const item of backups)fs.writeFileSync(path.join(root,item.file),item.content);}

try{
  const fleetObjective={id:`fleet-${pkg.workerId}`,priority:999,status:'queued',title:`Proven fleet package ${pkg.workerId}`,queueBatch:`fleet-${pkg.workerId}`,dependsOn:[],acceptance:pkg.tasks.flatMap(t=>t.acceptance||[])};
  const fleetTasks=pkg.tasks.map(t=>({...t,objectiveId:fleetObjective.id,status:'ready',dependsOn:[]}));
  fs.writeFileSync(path.join(root,'builder','brain','task-library.json'),JSON.stringify({version:9,tasks:fleetTasks},null,2)+'\n');
  fs.writeFileSync(path.join(root,'builder','brain','roadmap.json'),JSON.stringify({version:2,objectives:[fleetObjective]},null,2)+'\n');
  fs.writeFileSync(path.join(root,'config','autonomous-builder-queue.json'),JSON.stringify({version:1,batches:[{id:fleetObjective.queueBatch,objective:fleetObjective.id,status:'queued'}]},null,2)+'\n');
  const env={...process.env,BUILDER_COMPLETED_OBJECTIVES:'',AUTOBOT_MAX_GENERATED_WAVES:'0',AUTOBOT_PROVEN_WORKER_ID:pkg.workerId};
  const result=spawnSync(process.execPath,['builder/runner/long-run-executor.mjs'],{cwd:root,stdio:'inherit',env});
  process.exitCode=result.status??1;
}finally{restore();}
