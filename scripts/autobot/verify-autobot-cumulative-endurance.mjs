#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const registry=JSON.parse(fs.readFileSync(path.join(root,'builder/brain/autobot-fleet.json'),'utf8'));
const cycle=fs.readFileSync(path.join(root,'.github/workflows/autobot-endurance-cycle.yml'),'utf8');
const endurance=fs.readFileSync(path.join(root,'.github/workflows/autobot-endurance.yml'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
if(process.argv.includes('--cycle-gate')){
  assert(registry.enabled===true&&registry.coordination?.mode==='active','fleet must already be active');
  assert(registry.activationGate?.protectedIntegration===false,'protected integration must remain disabled');
  assert(registry.coordination?.maxConcurrentWorkers>=2,'two specialist lanes are required');
assert(registry.coordination?.enduranceWorkflow==='.github/workflows/autobot-endurance.yml','registry must expose endurance workflow');
assert(registry.coordination?.enduranceCycleWorkflow==='.github/workflows/autobot-endurance-cycle.yml','registry must expose reusable cycle workflow');
  process.exit(0);
}
assert(cycle.includes('workflow_call:'),'cycle must be reusable');
assert(cycle.includes('max-parallel: 2'),'specialists must remain parallel');
assert(cycle.includes('autobot-parallel-planner.mjs'),'every cycle must re-plan');
assert(cycle.includes('autobot-specialist-builder.mjs'),'every cycle must build product work');
assert(cycle.includes('autobot-specialist-recovery.mjs'),'existing recovery must remain');
assert(cycle.includes('autobot-endurance-candidate-check.mjs'),'candidates need independent QA/Reviewer verification');
assert(cycle.includes('verify:autobot-product-change-quality'),'endurance must use the canonical product-quality verifier');
assert(pkg.scripts?.['verify:autobot-cumulative-endurance']==='node scripts/autobot/verify-autobot-cumulative-endurance.mjs','package verifier registration is missing');
assert(cycle.includes('cumulative_ref:'),'cycle must return cumulative state');
assert(cycle.includes('git push --set-upstream origin'),'cumulative state must be preserved');
assert(endurance.includes('cycle1:')&&endurance.includes('cycle2:')&&endurance.includes('cycle3:'),'endurance must expose three sequential stages');
assert(endurance.includes('base_ref: ${{ needs.cycle1.outputs.cumulative_ref }}'),'cycle 2 must consume cycle 1');
assert(endurance.includes('base_ref: ${{ needs.cycle2.outputs.cumulative_ref }}'),'cycle 3 must consume cycle 2');
console.log(JSON.stringify({ok:true,sequentialCycles:3,parallelSpecialists:2,protectedIntegration:false},null,2));
