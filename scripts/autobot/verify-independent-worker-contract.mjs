#!/usr/bin/env node
/** Verify the isolated specialist fan-out/fan-in contract without activating new workers. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const assert=(ok,message)=>{if(!ok)throw new Error(message);};

const registry=json('builder/brain/autobot-fleet.json');
const contract=json('builder/brain/autobot-independent-worker-contract.json');
const music=read('.github/workflows/autobot-independent-music.yml');
const scene=read('.github/workflows/autobot-independent-scene.yml');
const fanIn=read('.github/workflows/autobot-independent-fan-in.yml');
const runner=read('builder/runner/autobot-independent-fan-in.mjs');
const specialist=read('builder/runner/autobot-specialist-builder.mjs');

assert(contract.schemaVersion===1,'independent worker contract schema must be v1');
assert(contract.productionLane?.preserved===true,'production lane must remain explicitly preserved');
assert(contract.activation?.productionPlannerDispatch===false,'experimental workers must not be planner-dispatchable yet');
assert(contract.activation?.protectedIntegration===false,'experimental workers must not bypass protected integration');
assert(registry.coordination?.independentWorkerContract==='builder/brain/autobot-independent-worker-contract.json','registry independent worker contract path missing');
assert(registry.coordination?.fanInLedger==='builder/working/autobot-fan-in-ledger.json','registry fan-in ledger path missing');
assert(registry.coordination?.fanInRunner==='builder/runner/autobot-independent-fan-in.mjs','registry fan-in runner path missing');

const experimental=registry.bots.filter(b=>b.experimental===true);
assert(experimental.map(b=>b.id).sort().join(',')==='music-builder,scene-builder','experimental specialist set must be Music + Scene');
for(const bot of experimental){
  assert(bot.status==='experimental','new specialists must remain experimental until separately proven');
  assert(bot.specialistBuilder===true,'experimental worker must use specialist Builder contract');
  assert(bot.protected===false,'experimental worker cannot be protected');
  assert(Array.isArray(bot.ownsFiles)&&bot.ownsFiles.length===1,'experimental worker must have one disjoint owned product file in the prototype');
}
assert(JSON.stringify(registry.activationGate.parallelWorkers)===JSON.stringify(['director-builder','timeline-builder']),'production activation gate must remain two-worker only');
assert(registry.coordination.maxConcurrentWorkers===2,'production concurrency gate must remain bounded at two');

for(const [name,text] of [['music',music],['scene',scene]]){
  assert(text.includes('workflow_dispatch:'),`${name} worker must be manually activated`);
  assert(text.includes('AUTOBOT_EXPERIMENTAL_WORKER: \'true\''),`${name} worker must explicitly opt into experimental execution`);
  assert(text.includes('AUTOBOT_COORDINATION_ID:'),`${name} worker must carry coordination identity`);
  assert(text.includes('actions/upload-artifact@v7'),`${name} worker must publish structured evidence`);
  assert(text.includes('git push --set-upstream origin'),`${name} worker must publish its candidate branch`);
  assert(text.includes('cancel-in-progress: false'),`${name} worker must not cancel sibling work`);
}
assert(fanIn.includes('workflow_run:'),'fan-in must consume independent worker completion events');
assert(fanIn.includes('actions: read'),'fan-in must be able to read worker artifacts');
assert(fanIn.includes('actions: write')===false,'fan-in does not need Actions write permission');
assert(fanIn.includes('git push --set-upstream origin'),'fan-in must publish one canonical ledger branch');
assert(runner.includes('coordinationId'),'fan-in runner must group results by coordination id');
assert(runner.includes('workers'),'fan-in runner must maintain one workers collection');
assert(runner.includes("status ="),'fan-in runner must classify outcomes');
assert(specialist.includes('AUTOBOT_EXPERIMENTAL_WORKER'),'specialist Builder must explicitly gate experimental workers');
assert(specialist.includes('coordinationId'),'specialist Builder must preserve coordination identity');
console.log(JSON.stringify({ok:true,productionWorkers:registry.activationGate.parallelWorkers,experimentalWorkers:experimental.map(b=>b.id),fanIn:'workflow_run -> one ledger branch per coordinationId',protectedIntegration:registry.activationGate.protectedIntegration}));
