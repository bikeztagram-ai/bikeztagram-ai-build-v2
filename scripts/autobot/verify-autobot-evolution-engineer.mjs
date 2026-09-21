#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>{try{return fs.readFileSync(p,'utf8')}catch{return ''}};
const json=p=>{try{return JSON.parse(read(p))}catch{return null}};
const wf=read('.github/workflows/autobot-evolution-engineer.yml');
const runner=read('builder/runner/autobot-evolution-engineer.mjs');
const policy=json('builder/brain/autobot-evolution-policy.json');
const learning=json('builder/brain/autobot-specialist-learning.json');
const checks=[
[wf.includes('workflow_run:')&&wf.includes('🧩 AutoBot Persistent Specialists'),'Evolution must observe production completion, not run as a production job dependency'],
[wf.includes('group: autobot-evolution-engineer')&&wf.includes('cancel-in-progress: false'),'Evolution must have isolated non-cancelling concurrency'],
[wf.includes('actions/download-artifact')&&wf.includes('run-id:'),'Evolution must consume completed-run evidence'],
[wf.includes('autobot-persistent-experimental-fan-in-'),'Evolution must consume the six-specialist fan-in artifact'],
[!wf.includes('needs: persistent-autobot'),'Evolution must not depend on the production job'],
[wf.includes('apply_experiment')&&wf.includes('default: false'),'Evolution experiments must be opt-in'],
[runner.includes("productionLane:{isolated:true,blocking:false"),'Production specialist lane must remain isolated and non-blocking'],
[runner.includes('automaticMerge:false')||runner.includes('humanReviewRequired:true'),'Evolution output must require human review'],
[runner.includes('fanIn')&&runner.includes('search-replace-no-exact-match')&&runner.includes('aider-controller-no-change'),'Evolution must classify specialist editing failures including Aider non-materialization'],
[runner.includes('autobot-specialist-learning.json')&&runner.includes('targetingMode'),'Evolution must generate bounded specialist targeting learning'],
[policy?.defaultApply===false&&policy?.automaticMerge===false&&policy?.productionDependency===false,'Policy must default to observe-only and require human promotion'],
[Array.isArray(policy?.allowedExperimentPaths)&&policy.allowedExperimentPaths.includes('builder/brain/autobot-specialist-learning.json'),'Learning profile must be an explicit allowed experiment path'],
[learning?.schemaVersion===1&&learning?.default?.targetingMode==='symbol-first','Specialist learning profile must have safe targeted-edit defaults'],
[runner.includes('productCodeModification:false')&&runner.includes('humanReviewRequired:true'),'Evolution must not modify product code or bypass review']
];
for(const [ok,msg] of checks)if(!ok)throw new Error(msg);
console.log(JSON.stringify({ok:true,checks:checks.length,productionLane:'unchanged',evolutionLane:'evidence-driven-specialist-learning'},null,2));
