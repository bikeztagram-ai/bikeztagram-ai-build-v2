#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>{try{return fs.readFileSync(p,'utf8')}catch{return ''}};
const json=p=>{try{return JSON.parse(read(p))}catch{return null}};
const wf=read('.github/workflows/autobot-evolution-engineer.yml');
const runner=read('builder/runner/autobot-evolution-engineer.mjs');
const policy=json('builder/brain/autobot-evolution-policy.json');
const fleet=json('builder/brain/autobot-fleet.json');
const checks=[
[wf.includes('workflow_run:')&&wf.includes('🧩 AutoBot Persistent Specialists'),'Evolution must observe production completion, not run as a production job dependency'],
[wf.includes('group: autobot-evolution-engineer')&&wf.includes('cancel-in-progress: false'),'Evolution must have isolated non-cancelling concurrency'],
[wf.includes('actions/download-artifact')&&wf.includes('run-id:'),'Evolution must consume completed-run evidence'],
[!wf.includes('needs: persistent-autobot'),'Evolution must not depend on the production job'],
[wf.includes('apply_experiment')&&wf.includes('default: false'),'Evolution experiments must be opt-in'],
[runner.includes("productionLane:{unchanged:true,blocking:false")&&runner.includes("workers:['director-builder','timeline-builder']"),'Production lane must remain explicitly unchanged and non-blocking'],
[runner.includes('automaticMerge:false')&&runner.includes('productionDependency:false'),'Evolution output must not auto-merge or become a production dependency'],
[runner.includes("'builder/runner/autobot-persistent-cycle-engine.mjs'")&&runner.includes("'builder/brain/autobot-fleet.json'")&&runner.includes("'src/'"),'Core engine, fleet registry and product source must be protected'],
[runner.includes('allow')&&runner.includes('autobot-evolution-engineer.mjs'),'Evolution has a bounded allowlist'],
[policy?.defaultApply===false&&policy?.automaticMerge===false&&policy?.productionDependency===false,'Policy must default to observe-only and require human promotion'],
[fleet?.bots?.some(b=>b.id==='autobot-evolver'&&b.analysisOnly===true&&b.entrypoint==='builder/runner/autobot-evolution-engineer.mjs'),'Fleet must register the Evolution Engineer as analysis-first'],
[fleet?.coordination?.maxConcurrentWorkers===2,'Evolution must not increase production specialist concurrency'],
[fleet?.activationGate?.parallelWorkers?.length===2&&fleet.activationGate.parallelWorkers.includes('director-builder')&&fleet.activationGate.parallelWorkers.includes('timeline-builder'),'Production activation gate must remain exactly two specialists']
];
for(const [ok,msg] of checks)if(!ok)throw new Error(msg);
console.log(JSON.stringify({ok:true,checks:checks.length,productionLane:'unchanged',evolutionLane:'isolated'},null,2));