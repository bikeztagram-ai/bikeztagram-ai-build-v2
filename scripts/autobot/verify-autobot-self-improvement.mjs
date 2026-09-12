#!/usr/bin/env node
/** Verify the analysis-only AutoBot Self-Improvement Bot contract. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const botFile='builder/runner/autobot-self-improvement.mjs';
const verifierFile='scripts/autobot/verify-autobot-self-improvement.mjs';
const outputFile='builder/working/autobot-self-improvement.json';
const registryFile='builder/brain/autobot-fleet.json';
const docFile='builder/brain/autobot-fleet-foundation.md';
const workflow='.github/workflows/autonomous-builder-v2-fast.yml';
function assert(condition,message){if(!condition)throw new Error(message);}
const bot=fs.readFileSync(path.join(root,botFile),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryFile),'utf8'));
const doc=fs.readFileSync(path.join(root,docFile),'utf8');
const workflowText=fs.readFileSync(path.join(root,workflow),'utf8');
assert(fs.existsSync(path.join(root,botFile)),'registered Self-Improvement Bot path must exist');
assert(registry.bots.some(b=>b.id==='self-improvement'&&b.status==='verified'&&b.entrypoint===botFile&&b.protected===false),'registry must exactly discover verified Self-Improvement Bot');
assert(bot.includes('analysisOnly:true'),'Self-Improvement Bot must be analysis-only');
assert(bot.includes('AUTOBOT_SELF_IMPROVEMENT_OUTPUT'),'output path must be explicitly configurable');
assert(bot.includes('AUTOBOT_SELF_IMPROVEMENT_MAX_PATTERNS'),'pattern limit must be explicitly configurable');
assert(bot.includes('autobot-failure-queue.jsonl'),'bot must consume the durable failure queue');
assert(bot.includes('autobot-live-telemetry.log'),'bot must consume live telemetry evidence');
assert(bot.includes('autobot-state.json'),'bot must inspect resumable builder state when present');
assert(bot.includes('autobot-self-improvement-v1'),'stable output schema must be declared');
assert(bot.includes('requiresHumanReview:true'),'every proposal must require human review');
assert(bot.includes('appliedChanges:[]'),'bot must declare that it applies no changes');
assert(bot.includes('protectedPaths'),'protected paths must be explicit');
assert(!bot.includes('create_file')&&!bot.includes('update_file'),'bot must not contain repository write APIs');
assert(!bot.includes('git commit')&&!bot.includes('git push'),'bot must not commit or push');
assert(doc.includes('Self-Improvement Bot'),'foundation documentation must describe Self-Improvement Bot');
assert(doc.includes(botFile),'documentation must use the exact Self-Improvement Bot path');
assert(doc.includes(outputFile),'documentation must use the exact Self-Improvement evidence path');
assert(!workflowText.includes('autobot-self-improvement.mjs'),'production workflow must not activate Self-Improvement yet');

const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'bikeztagram-self-improvement-'));
try{
  const queue=path.join(tempDir,'autobot-failure-queue.jsonl');
  const telemetry=path.join(tempDir,'autobot-live-telemetry.log');
  const state=path.join(tempDir,'autobot-state.json');
  const output=path.join(tempDir,'result.json');
  fs.writeFileSync(queue,[
    JSON.stringify({id:'f1',status:'blocked',stage:'verification',error:'syntax failure',files:['src/aiEditPlanner.js']}),
    JSON.stringify({id:'f2',status:'blocked',stage:'verification',error:'syntax failure',files:['src/aiEditPlanner.js']}),
    JSON.stringify({id:'f3',status:'repaired',stage:'planner',error:'story selection regression',files:['src/aiEditPlanner.js']})+'\n'
  ].join('\n'));
  fs.writeFileSync(telemetry,JSON.stringify({schema:'autobot-live-telemetry-v1',event:'heartbeat',noProgress:1})+'\n');
  fs.writeFileSync(state,JSON.stringify({resumable:true}));
  const runner=path.join(root,botFile);
  const result=execFileSync(process.execPath,[runner],{cwd:root,env:{...process.env,AUTOBOT_SELF_IMPROVEMENT_OUTPUT:output,AUTOBOT_FAILURE_QUEUE_PATH:queue,AUTOBOT_SELF_IMPROVEMENT_MAX_PATTERNS:'5'},encoding:'utf8'});
  assert(/"analysisOnly":true/.test(result),'bot must report analysis-only execution');
  const evidence=JSON.parse(fs.readFileSync(output,'utf8'));
  assert(evidence.schema==='autobot-self-improvement-v1','output schema must match contract');
  assert(evidence.analysisOnly===true,'output must remain analysis-only');
  assert(evidence.summary.failureRecords===3,'synthetic failure records must be consumed');
  assert(evidence.patterns.some(p=>p.recurrence==='repeated'),'recurring failure evidence must be detected');
  assert(evidence.proposals.every(p=>p.requiresHumanReview===true),'all proposals must require human review');
  assert(Array.isArray(evidence.appliedChanges)&&evidence.appliedChanges.length===0,'bot must apply no changes');
}finally{fs.rmSync(tempDir,{recursive:true,force:true});}
execFileSync(process.execPath,['--check',botFile],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,schema:'autobot-self-improvement-v1',analysisOnly:true,entrypoint:botFile,evidence:outputFile,workflowActivation:false}));
