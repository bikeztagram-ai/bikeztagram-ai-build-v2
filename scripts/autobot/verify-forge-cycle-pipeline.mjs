#!/usr/bin/env node
/**
 * Deep static contract audit for the Forge cycle pipeline.
 *
 * Contract:
 *   Cycle N production consumes Cycle N-1 research.
 *   Cycle N research is harvested into the durable handoff for Cycle N+1.
 *   Research and Trial Builder never gate production completion.
 */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const workflow=read('.github/workflows/autobot-forge-parallel-run.yml');
const lane=read('builder/runner/autobot-independent-specialist-lane.mjs');
const harvest=read('scripts/autobot/harvest-research-swarm.mjs');
const failures=[];
const assert=(ok,msg)=>{if(!ok)failures.push(msg);};

assert(workflow.includes('permissions:\n  actions: write\n  contents: read'),'Forge launcher must keep its top-level token permissions read-only for repository contents.');
assert(/name: 📚 Harvest research evidence[\s\S]*?permissions:\s*contents: write\s*actions: read/.test(workflow),'research harvest job must have contents:write because job-level permissions override the workflow default.');
assert(workflow.includes('autobot/research-handoff'),'Forge workflow must persist research on a dedicated handoff branch.');
assert(workflow.includes('builder/brain/autobot-forge-next-cycle.json'),'durable next-cycle handoff file must be written.');
assert(workflow.includes('git push origin HEAD:autobot/research-handoff'),'research harvest must publish the handoff for the following cycle.');
assert(harvest.includes("schemaVersion:'autobot-research-next-cycle-v2'"),'research harvest must emit the v2 next-cycle schema.');
assert(harvest.includes('productionHandoff:'),'research harvest must include a production-facing advisory handoff.');
assert(harvest.includes('signalClusters'),'research harvest must cluster repeated evidence signatures.');
assert(harvest.includes('uniqueSignalSignatures'),'research harvest must report unique signal signatures.');
assert(harvest.includes('duplicateExperiments'),'research harvest must report duplicate/repeated experiment volume.');
assert(harvest.includes('reproducedSuccessfulSignals'),'research harvest must distinguish reproduced successful signals from single observations.');
assert(harvest.includes('topSignals'),'research harvest must expose bounded top signals for the Trial Builder and next-cycle planner.');
assert(harvest.includes('promising.slice(0,12)'),'production handoff must be bounded.');
assert(workflow.includes('runs-on: ubuntu-24.04'),'Forge launcher should be pinned to Ubuntu 24.04 before ubuntu-latest migrates.');
assert(lane.includes('autobot/research-handoff'),'production lane must read the durable prior-cycle research branch.');
assert(lane.includes('autobot-forge-next-cycle.json'),'production lane must consume the durable next-cycle research file.');
assert(lane.includes('Prior-cycle Forge research is advisory evidence only.'),'production lane must treat research as evidence, not authority.');
assert(lane.includes('reject unsupported claims'),'production lane must explicitly reject unsupported research claims.');
assert(lane.includes('Do not modify workflows, CI, secrets or orchestration'),'production specialists must not turn research into workflow/infrastructure edits.');
assert(workflow.indexOf('production-dispatch') < workflow.indexOf('research-plan'),'production dispatch must begin before research planning.');
assert(workflow.indexOf('production-start-gate') < workflow.indexOf('research-plan'),'research must start only after the ten production lanes have claimed runners.');
assert(workflow.includes('needs: [production-dispatch]\n    if: always()'),'production finalization must depend only on the production child.');
assert(!workflow.includes('needs: [production-dispatch, trial-builder]'),'production finalization must not wait for Trial Builder.');
assert(/trial-builder:[\s\S]*?continue-on-error:\s*true[\s\S]*?runs-on:\s*ubuntu-24\.04/.test(workflow),'Trial Builder must be experimental/non-blocking.');
assert(workflow.includes('ref: autobot/trial-builder'),'Trial Builder must use the persistent isolated branch.');
assert(workflow.includes('builder/trial-builder/engine.mjs'),'Forge workflow must execute the isolated Trial Builder engine.');
assert(workflow.includes("TRIAL_MODEL_TIMEOUT_MS: '120000'"),'Trial Builder model calls should start with a bounded two-minute timeout; the engine adapts after timeouts.');
assert(workflow.includes('git -C trial-branch status --short'),'Trial Builder must enforce its branch scope before persistence.');
execFileSync(process.execPath,['--check','builder/runner/autobot-independent-specialist-lane.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','scripts/autobot/harvest-research-swarm.mjs'],{stdio:'inherit'});
console.log(JSON.stringify({ok:failures.length===0,failures,productionConsumesPreviousResearch:true,researchProducesNextCycleHandoff:true,researchNonBlocking:true,trialNonBlocking:true},null,2));
if(failures.length) process.exit(1);
