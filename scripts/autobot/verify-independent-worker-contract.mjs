#!/usr/bin/env node
/** Verify the production isolated specialist fan-out/fan-in contract. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const assert=(ok,message)=>{if(!ok)throw new Error(message);};

const registry=json('builder/brain/autobot-fleet.json');
const contract=json('builder/brain/autobot-independent-worker-contract.json');
const workflow=read('.github/workflows/autobot-parallel-specialists.yml');
const fanIn=read('builder/runner/autobot-independent-fan-in.mjs');
const specialist=read('builder/runner/autobot-specialist-builder.mjs');
const laneRunner=read('builder/runner/autobot-independent-specialist-lane.mjs');

assert(contract.schemaVersion===1,'independent worker contract schema must be v1');
assert(contract.productionLane?.preserved===true,'production lane must remain explicitly preserved');
assert(contract.activation?.productionPlannerDispatch===false,'isolated specialist workflow must remain manually activated');
assert(contract.activation?.protectedIntegration===false,'isolated specialists must not bypass protected integration');
assert(registry.coordination?.independentWorkerContract==='builder/brain/autobot-independent-worker-contract.json','registry independent worker contract path missing');
assert(registry.coordination?.fanInLedger==='builder/working/autobot-fan-in-ledger.json','registry fan-in ledger path missing');
assert(registry.coordination?.fanInRunner==='builder/runner/autobot-independent-fan-in.mjs','registry fan-in runner path missing');

const production=registry.bots.filter(b=>b.specialistBuilder===true&&b.status==='verified');
const expected=['director-builder','timeline-builder','music-builder','scene-builder','rhythm-builder','render-builder','media-intelligence-builder','caption-builder','intent-builder','continuity-builder'];
assert(JSON.stringify(production.map(b=>b.id))===JSON.stringify(expected),'isolated production specialist set must be the ten registered lanes');
assert(registry.activationGate?.protectedIntegration===false,'protected integration must remain disabled');
assert(JSON.stringify(registry.activationGate?.parallelWorkers||[])===JSON.stringify(expected),'activation gate must name all ten isolated specialists');
assert(registry.coordination?.maxConcurrentWorkers===10,'production isolated worker concurrency must be bounded at ten');

for(const bot of production){
  assert(bot.specialistBuilder===true,'production specialist must use Specialist Builder contract');
  assert(bot.protected===false,'production specialist cannot be protected');
  assert(Array.isArray(bot.ownsFiles)&&bot.ownsFiles.length===1,'production specialist must own exactly one product file: '+bot.id);
}

assert(workflow.includes('workflow_dispatch:'),'isolated specialist swarm must be manually activated');
assert(expected.every(id=>workflow.includes(`experimental-${id.replace('-builder','')}:`)),'isolated specialist swarm must define a separate job for every production specialist');
assert((workflow.match(/^    needs:/gm)||[]).length===1,'no specialist lane may depend on another specialist; only the final fan-in may declare needs');
assert(workflow.includes('if: always()'),'fan-in must remain unconditional even when a specialist lane fails');
assert(workflow.includes("AUTOBOT_EXPERIMENTAL_WORKER: 'false'"),'production swarm must not rely on experimental-worker mode');
assert(workflow.includes('actions/upload-artifact@v6'),'specialist jobs must publish structured evidence');
assert(workflow.includes('needs: [experimental-director, experimental-timeline, experimental-music, experimental-scene, experimental-rhythm, experimental-render, experimental-media-intelligence, experimental-caption, experimental-intent, experimental-continuity]'),'fan-in must wait for all ten isolated specialists');
assert(workflow.includes('actions/download-artifact@v7'),'fan-in must download specialist evidence');
assert(fanIn.includes('coordinationId'),'fan-in runner must group results by coordination id');
assert(fanIn.includes('workers'),'fan-in runner must maintain one workers collection');
assert(fanIn.includes('status ='),'fan-in runner must classify outcomes');
assert(fanIn.includes('candidateOrigin'),'fan-in ledger must preserve candidate origin');
assert(fanIn.includes('aiderMaterialized'),'fan-in ledger must preserve Aider materialization state');
assert(fanIn.includes('(outcome || {})'),'fan-in must prefer rich outcome evidence over sparse handoff evidence');
assert(specialist.includes('AUTOBOT_EXPERIMENTAL_WORKER'),'specialist Builder must retain explicit experimental gating support');
assert(specialist.includes('coordinationId'),'specialist Builder must preserve coordination identity');
assert(laneRunner.includes('AUTOBOT_BASE_REF') && laneRunner.includes('configuredBaseRef || \'HEAD\''),'persistent lane must honor an explicit starting base reference');
assert(laneRunner.includes('cycle-${cycle}') && laneRunner.includes('canonicalResultDir'),'persistent lane must retain per-cycle QA evidence and a stable latest-cycle evidence path');
assert(laneRunner.includes('AUTOBOT_EXPECTED_CYCLE_BASE_COMMIT'),'persistent lane must bind QA/Reviewer to the exact current verified base SHA');
assert(laneRunner.includes('AUTOBOT_JOB_STARTED_AT_MS'),'persistent lane deadline must be anchored to the GitHub job start so bootstrap time cannot push the job past its timeout');
assert((workflow.match(/Record specialist job start/g)||[]).length===10,'each production specialist lane must record its own job start time');
assert((workflow.match(/timeout-minutes: 350/g)||[]).length===10,'each production specialist lane must retain the existing 350-minute job timeout');

console.log(JSON.stringify({ok:true,productionWorkers:expected,fanIn:'ten isolated jobs -> one canonical ledger',protectedIntegration:registry.activationGate.protectedIntegration}));
