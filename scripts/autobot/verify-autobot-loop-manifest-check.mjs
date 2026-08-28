import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('scripts/autobot/verify-autobot-loop-manifest.json','utf8'));
if(manifest.providerIndependent!==true)throw new Error('AutoBot must be provider independent');
for(const key of ['strategicPlanner','planningGate','qualityFeedback','prGate','workflow'])if(!manifest[key])throw new Error(`Missing ${key}`);
console.log('PASS AutoBot V3 manifest');
