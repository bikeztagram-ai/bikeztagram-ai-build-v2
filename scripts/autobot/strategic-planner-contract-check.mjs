import fs from 'node:fs';
const spec=fs.readFileSync('builder/brain/STRATEGIC_BRAIN_SPEC.md','utf8');
const planner=fs.readFileSync('builder/brain/strategic-planner.mjs','utf8');
if(!spec.includes('local and deterministic'))throw new Error('Strategic brain provider policy missing');
if(!spec.includes('Finish eligible queued production work'))throw new Error('Decision hierarchy missing');
if(!planner.includes('externalAi: false'))throw new Error('Planner must declare externalAi false');
console.log('PASS strategic brain contract');
