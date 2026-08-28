import fs from 'node:fs';
const text=fs.readFileSync('scripts/autobot/verify-autobot-loop-status.mjs','utf8');
if(!text.includes('external AI provider not required'))throw new Error('Provider-independent status missing');
console.log('PASS AutoBot V3 status contract');
