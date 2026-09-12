#!/usr/bin/env node
/** AutoBot fleet coordinator foundation: PLAN-ONLY safe handoff scheduler. */
import fs from 'node:fs';
import path from 'node:path';
import { queueSummary } from './autobot-failure-queue.mjs';
const root=process.cwd();
const registryPath=path.join(root,'builder','brain','autobot-fleet.json');
const statePath=path.join(root,'builder','working','aider-feature-brain-state.json');
const outputPath=process.env.AUTOBOT_FLEET_PLAN_PATH||path.join(root,'builder','working','autobot-fleet-plan.json');
const reviewBaseCommit=String(process.env.AUTOBOT_REVIEW_BASE_COMMIT||'').trim();
const reviewCommit=String(process.env.AUTOBOT_REVIEW_COMMIT||'').trim();
const specialistBotId=String(process.env.AUTOBOT_SPECIALIST_BOT_ID||'').trim();
const specialistObjective=String(process.env.AUTOBOT_SPECIALIST_OBJECTIVE||'').trim();
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function existingWorker(bot){return ['proven','verified'].includes(bot?.status)&&typeof bot.entrypoint==='string'&&!bot.entrypoint.startsWith('future:')&&fs.existsSync(path.join(root,bot.entrypoint));}
function worker(registry,id){return registry.bots.find(bot=>bot.id===id)||null;}
function decision(kind,bot,reason,extra={}){return {kind,botId:bot?.id||null,entrypoint:bot?.entrypoint||null,executable:Boolean(bot&&existingWorker(bot)),reason,...extra};}
function validCommit(value){return /^[0-9a-f]{40}$/i.test(value);}
function chooseNext(registry,state,queue){
 const builder=worker(registry,'builder'); const reviewer=worker(registry,'reviewer'); const repair=worker(registry,'repair'); const qa=worker(registry,'qa'); const specialist=worker(registry,specialistBotId);
 if(queue.repaired.length)return decision('qa-required',qa,'a repaired handoff is waiting for independent QA; protected builder work must not resume before verification.',{failureIds:queue.repaired.map(r=>r.id)});
 if(queue.open.length)return decision('repair-required',repair,'open failure evidence exists; isolated repair must complete before protected builder resumes.',{failureIds:queue.open.map(r=>r.id)});
 if(state?.inProgress?.id)return decision('resume-builder-objective',builder,'the proven builder has resumable objective state.',{objectiveId:state.inProgress.id});
 if(reviewer&&existingWorker(reviewer)&&validCommit(reviewBaseCommit)&&validCommit(reviewCommit))return decision('reviewer-required',reviewer,'an explicit candidate handoff contract supplied the exact base and candidate commits for adversarial review.',{baseCommit:reviewBaseCommit,candidateCommit:reviewCommit});
 if(specialist&&specialist.specialistBuilder===true&&existingWorker(specialist)&&specialist.status==='verified'&&specialistObjective)return decision('specialist-builder-required',specialist,'an explicit registry bot id and objective selected a verified specialist Builder.',{objective:specialistObjective,ownsFiles:Array.isArray(specialist.ownsFiles)?specialist.ownsFiles:[]});
 return decision('builder-ready',builder,'no repair, QA, Reviewer or specialist handoff is pending; the proven Builder is the next worker in the foundation plan.');
}
const registry=readJson(registryPath); if(registry.schemaVersion!==1)throw new Error(`unsupported AutoBot fleet registry schema: ${registry.schemaVersion}`); const state=fs.existsSync(statePath)?readJson(statePath):{}; const queue=queueSummary(); const next=chooseNext(registry,state,queue);
const plan={schemaVersion:1,generatedAt:new Date().toISOString(),mode:registry.coordination?.mode||'plan-only',enabled:Boolean(registry.enabled),maxConcurrentWorkers:Number(registry.coordination?.maxConcurrentWorkers||1),protectedBuilder:{botId:'builder',entrypoint:'builder/runner/aider-feature-brain.mjs',preserved:true},queue:{path:queue.path,openCount:queue.open.length,repairedCount:queue.repaired.length,records:queue.records},reviewCandidate:{baseCommit:validCommit(reviewBaseCommit)?reviewBaseCommit:null,candidateCommit:validCommit(reviewCommit)?reviewCommit:null,contract:'AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT'},specialistCandidate:{botId:specialistBotId||null,objective:specialistObjective||null,contract:'AUTOBOT_SPECIALIST_BOT_ID + AUTOBOT_SPECIALIST_OBJECTIVE'},next,activationBlocked:registry.enabled!==true||registry.coordination?.mode!=='active',policy:'No worker is launched by this foundation coordinator. Activation requires a separately verified scheduler, isolated workspaces, handoff contracts, rollback and production gates.'};
fs.mkdirSync(path.dirname(outputPath),{recursive:true}); fs.writeFileSync(outputPath,JSON.stringify(plan,null,2)+'\n'); console.log(JSON.stringify(plan,null,2));
