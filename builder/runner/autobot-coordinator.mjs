#!/usr/bin/env node
/**
 * AutoBot fleet coordinator foundation.
 *
 * V1 is deliberately PLAN-ONLY: it proves fleet discovery, handoff ordering and
 * protected-worker policy without launching additional agents or changing the
 * existing proven workflow. Activation is a later, separately verified stage.
 */
import fs from 'node:fs';
import path from 'node:path';
import { queueSummary } from './autobot-failure-queue.mjs';

const root=process.cwd();
const registryPath=path.join(root,'builder','brain','autobot-fleet.json');
const statePath=path.join(root,'builder','working','aider-feature-brain-state.json');
const outputPath=process.env.AUTOBOT_FLEET_PLAN_PATH||path.join(root,'builder','working','autobot-fleet-plan.json');

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function existingWorker(bot){return ['proven','verified'].includes(bot?.status)&&typeof bot.entrypoint==='string'&&!bot.entrypoint.startsWith('future:')&&fs.existsSync(path.join(root,bot.entrypoint));}
function chooseNext(registry,state,queue){
  const builder=registry.bots.find(bot=>bot.id==='builder');
  if(queue.repaired.length){
    const qa=registry.bots.find(bot=>bot.id==='qa');
    return {
      kind:'qa-required',
      botId:qa?.id||null,
      executable:Boolean(qa&&existingWorker(qa)),
      reason:'a repaired handoff is waiting for independent QA; protected builder work must not resume before verification.',
      failureIds:queue.repaired.map(record=>record.id)
    };
  }
  if(queue.open.length){
    const repair=registry.bots.find(bot=>bot.id==='repair');
    return {
      kind:'repair-required',
      botId:repair?.id||null,
      executable:Boolean(repair&&existingWorker(repair)),
      reason:'open failure evidence exists; repair must be isolated and verified before protected builder resumes.',
      failureIds:queue.open.map(record=>record.id)
    };
  }
  if(state?.inProgress?.id){
    return {kind:'resume-builder-objective',botId:builder?.id||null,executable:Boolean(builder&&existingWorker(builder)),objectiveId:state.inProgress.id,reason:'the proven builder has resumable objective state.'};
  }
  return {kind:'builder-ready',botId:builder?.id||null,executable:Boolean(builder&&existingWorker(builder)),reason:'no repair or QA handoff is pending; the proven builder remains the only active worker in foundation mode.'};
}

const registry=readJson(registryPath);
if(registry.schemaVersion!==1)throw new Error(`unsupported AutoBot fleet registry schema: ${registry.schemaVersion}`);
const state=fs.existsSync(statePath)?readJson(statePath):{};
const queue=queueSummary();
const next=chooseNext(registry,state,queue);
const plan={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  mode:registry.coordination?.mode||'plan-only',
  enabled:Boolean(registry.enabled),
  maxConcurrentWorkers:Number(registry.coordination?.maxConcurrentWorkers||1),
  protectedBuilder:{botId:'builder',entrypoint:'builder/runner/aider-feature-brain.mjs',preserved:true},
  queue:{path:queue.path,openCount:queue.open.length,repairedCount:queue.repaired.length,records:queue.records},
  next,
  activationBlocked:registry.enabled!==true||registry.coordination?.mode!=='active',
  policy:'No worker is launched by this foundation coordinator. Activation requires a separately verified scheduler, isolated workspaces, handoff contracts, rollback and production gates.'
};
fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify(plan,null,2));
