#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const registry=JSON.parse(fs.readFileSync(path.join(root,'builder/brain/autobot-fleet.json'),'utf8'));
const workflow=fs.readFileSync(path.join(root,'.github/workflows/autobot-parallel-specialists.yml'),'utf8');
const planner=fs.readFileSync(path.join(root,'builder/runner/autobot-parallel-planner.mjs'),'utf8');
const specialist=fs.readFileSync(path.join(root,'builder/runner/autobot-specialist-builder.mjs'),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const gateOnly=process.argv.includes('--gate-only');
assert(registry.schemaVersion===1,'fleet registry schema must be v1');
if(gateOnly){
  assert(registry.enabled===true&&registry.coordination?.mode==='active','parallel fleet is not live-authorized');
  assert(registry.coordination?.maxConcurrentWorkers>=2,'parallel fleet remains blocked until maxConcurrentWorkers is explicitly raised to at least 2');
  assert(registry.activationGate?.protectedIntegration===false,'protected integration must remain disabled');
  assert(Array.isArray(registry.activationGate?.parallelWorkers)&&registry.activationGate.parallelWorkers.length===2,'exactly two parallel workers must be explicitly authorized');
  console.log(JSON.stringify({ok:true,gate:'parallel-authorized',workers:registry.activationGate.parallelWorkers}));
  process.exit(0);
}
assert(workflow.includes('strategy:')&&workflow.includes('max-parallel: 2'),'parallel workflow must use a two-lane matrix');
assert(workflow.includes('director-builder')&&workflow.includes('timeline-builder'),'parallel workflow must activate the two registered specialist Builders only');
assert(workflow.includes('actions/upload-artifact@v4')&&workflow.includes('actions/download-artifact@v5'),'parallel planner/workers must exchange structured plan evidence through artifacts');
assert(workflow.includes('AUTOBOT_SPECIALIST_BOT_ID')&&workflow.includes('AUTOBOT_SPECIALIST_OBJECTIVE')&&workflow.includes('AUTOBOT_SPECIALIST_BUILDER_ENABLED'),'parallel workflow must use the specialist execution contract');
assert(workflow.includes('AUTOBOT_SPECIALIST_PRODUCT_QUALITY_CHECK'),'parallel workflow must retain product-quality verification');
assert(planner.includes('maxConcurrentWorkers<2'),'planner must refuse execution before parallel activation');
assert(planner.includes('seenFiles')&&planner.includes('scope overlaps another parallel worker'),'planner must reject overlapping file scopes');
assert(planner.includes('Create one genuinely new user-facing product capability per specialist')&&planner.includes('Do not repeat these already-completed specialist objectives')&&planner.includes('No infrastructure, automation, CI, or provider work'),'planner must perform evidence-based product-facing discovery without repeating completed work or drifting into infrastructure');
assert(specialist.includes('writeSpecialistHandoff')&&specialist.includes("status:'verified-candidate'"),'specialist worker must produce a verified candidate handoff');
console.log(JSON.stringify({ok:true,parallelWorkflow:'two specialist lanes',gate:'explicit registry authorization required',protectedIntegration:false}));
