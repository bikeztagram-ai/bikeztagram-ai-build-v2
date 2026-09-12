#!/usr/bin/env node
/** AutoBot fleet coordinator foundation: PLAN-ONLY safe handoff scheduler. */
import fs from 'node:fs';
import path from 'node:path';
import { queueSummary } from './autobot-failure-queue.mjs';
const root=process.cwd();
const registryPath=path.join(root,'builder','brain','autobot-fleet.json');
const statePath=path.join(root,'builder','working','aider-feature-brain-state.json');
const outputPath=process.env.AUTOBOT_FLEET_PLAN_PATH||path.join(root,'builder','working','autobot-fleet-plan.json');
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function existingWorker(bot){return ['proven','verified'].includes(bot?.status)&&typeof bot.entrypoint==='string'&&!bot.entrypoint.startsWith('future:')&&fs.existsSync(path.join(root,bot.entrypoint));}
function worker(registry,id){return registry.bots.find(bot=>bot.id===id)||null;}
function decision(kind,bot,reason,extra={}){return {kind,botId:bot?.id||null,entrypoint:bot?.entrypoint||null,executable:Boolean(bot&&existingWorker(bot)),reason,...extra};}
function chooseNext(registry,state,queue){
 const builder=worker(registry,'builder'); const reviewer=worker(registry,'reviewer'); const repair=worker(registry,'repair'); const qa=worker(registry,'qa');
 if(queue.repaired.length)return decision('qa-required',qa,'a repaired handoff is waiting for independent QA; protected builder work must not resume before verification.',{failureIds:queue.repaired.map(r=>r.id)});
 if(queue.open.length)return decision('repair-required',repair,'open failure evidence exists; isolated repair must complete before protected builder resumes.',{failureIds:queue.open.map(r=>r.id)});
 if(state?.inProgress?.id)return decision('resume-builder-objective',builder,'the proven builder has resumable objective state.',{objectiveId:state.inProgress.id});
 if(state?.lastRunCommit&&reviewer&&existingWorker(reviewer))return decision('reviewer-required',reviewer,'the Builder has a completed candidate commit that should receive adversarial product review before another protected objective begins.',{candidateCommit:state.lastRunCommit});
 return decision('builder-ready',builder,'no repair or QA handoff is pending; the proven builder is the next worker in the foundation plan.');
}
const registry=readJson(registryPath); if(registry.schemaVersion!==1)throw new Error(`unsupported AutoBot fleet registry schema: ${registry.schemaVersion}`);
const state=fs.existsSync(statePath)?readJson(statePath):{}; const queue=queueSummary(); const next=chooseNext(registry,state,queue);
const plan={schemaVersion:1,generatedAt:new Date().toISOString(),mode:registry.coordination?.mode||'plan-only',enabled:Boolean(registry.enabled),maxConcurrentWorkers:Number(registry.coordination?.maxConcurrentWorkers||1),protectedBuilder:{botId:'builder',entrypoint:'builder/runner/aider-feature-brain.mjs',preserved:true},queue:{path:queue.path,openCount:queue.open.length,repairedCount:queue.repaired.length,records:queue.records},next,activationBlocked:registry.enabled!==true||registry.coordination?.mode!=='active',policy:'No worker is launched by this foundation coordinator. Activation requires a separately verified scheduler, isolated workspaces, handoff contracts, rollback and production gates.'};
fs.mkdirSync(path.dirname(outputPath),{recursive:true}); fs.writeFileSync(outputPath,JSON.stringify(plan,null,2)+'\n'); console.log(JSON.stringify(plan,null,2));
