#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const registry=JSON.parse(fs.readFileSync(path.join(root,'builder/brain/autobot-fleet.json'),'utf8'));
const workflow=fs.readFileSync(path.join(root,'.github/workflows/autobot-parallel-specialists.yml'),'utf8');
const planner=fs.readFileSync(path.join(root,'builder/runner/autobot-parallel-planner.mjs'),'utf8');
const specialist=fs.readFileSync(path.join(root,'builder/runner/autobot-specialist-builder.mjs'),'utf8');
const structuredFallback=fs.readFileSync(path.join(root,'builder/runner/feature-brain.mjs'),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const gateOnly=process.argv.includes('--gate-only');
assert(registry.schemaVersion===1,'fleet registry schema must be v1');
if(gateOnly){
  assert(registry.enabled===true&&registry.coordination?.mode==='active','parallel fleet is not live-authorized');
  assert(registry.coordination?.maxConcurrentWorkers>=10,'parallel fleet remains blocked until maxConcurrentWorkers is explicitly raised to at least 10');
  assert(registry.activationGate?.protectedIntegration===false,'protected integration must remain disabled');
  assert(Array.isArray(registry.activationGate?.parallelWorkers)&&registry.activationGate.parallelWorkers.length===10,'exactly ten parallel workers must be explicitly authorized');
  console.log(JSON.stringify({ok:true,gate:'parallel-authorized',workers:registry.activationGate.parallelWorkers}));
  process.exit(0);
}
assert(workflow.includes('experimental-director')&&workflow.includes('experimental-timeline')&&workflow.includes('experimental-music')&&workflow.includes('experimental-scene')&&workflow.includes('experimental-rhythm')&&workflow.includes('experimental-render')&&workflow.includes('experimental-media-intelligence')&&workflow.includes('experimental-caption')&&workflow.includes('experimental-intent')&&workflow.includes('experimental-continuity'),'parallel workflow must activate all ten isolated specialist Builders');
assert(!workflow.includes('persistent-autobot:'),'joined persistent production lane must be removed');
assert(workflow.includes('director-builder')&&workflow.includes('timeline-builder'),'parallel workflow must retain Director, Timeline and the ten-lane specialist identities');
assert(workflow.includes('actions/upload-artifact@v7')&&workflow.includes('actions/download-artifact@v7'),'parallel planner/workers must exchange structured plan evidence through current Node24 artifact actions');
assert(workflow.includes('AUTOBOT_SPECIALIST_BOT_ID')&&workflow.includes('AUTOBOT_SPECIALIST_OBJECTIVE')&&workflow.includes('AUTOBOT_SPECIALIST_BUILDER_ENABLED'),'parallel workflow must use the specialist execution contract');
assert(workflow.includes('AUTOBOT_SPECIALIST_PRODUCT_QUALITY_CHECK'),'parallel workflow must retain product-quality verification');
assert(workflow.includes('builder/runner/autobot-endurance-candidate-check.mjs'),'every specialist lane must route its candidate through independent QA + Reviewer verification');
assert((workflow.match(/Independent QA \+ Reviewer /g)||[]).length===10,'every one of the ten specialist lanes must have its own downstream QA + Reviewer stage');
assert(workflow.includes('AUTOBOT_EXPECTED_CYCLE_BASE_COMMIT'),'candidate verification must bind to the exact current cycle base commit');
assert(workflow.includes('AUTOBOT_CANDIDATE_REVIEW_OUTPUT'),'candidate review evidence must be persisted per specialist lane');
assert(workflow.includes('autobot-candidate-review-ledger.json'),'fan-in must publish one central candidate QA + Reviewer ledger');
assert(planner.includes('maxConcurrentWorkers<2'),'planner must refuse execution before parallel activation');
assert(planner.includes('seenFiles')&&planner.includes('scope overlaps another parallel worker'),'planner must reject overlapping file scopes');
assert(planner.includes('Create one genuinely new user-facing product capability per specialist')&&planner.includes('Do not repeat these already-completed specialist objectives')&&planner.includes('No infrastructure, automation, CI, or provider work'),'planner must perform evidence-based product-facing discovery without repeating completed work or drifting into infrastructure');
assert(specialist.includes('writeSpecialistHandoff')&&/status:\s*['"]verified-candidate['"]/.test(specialist),'specialist worker must produce a verified candidate handoff');
assert(structuredFallback.includes('overlapping edits in one file are disabled for safety')&&!structuredFallback.includes('multiple edits in one file are disabled for safety'),'structured fallback must permit only non-overlapping multiple edits within a declared file');
console.log(JSON.stringify({ok:true,parallelWorkflow:'ten isolated specialist lanes',gate:'explicit registry authorization required',protectedIntegration:false}));
