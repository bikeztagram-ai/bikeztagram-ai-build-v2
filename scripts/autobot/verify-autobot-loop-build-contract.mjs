import fs from 'node:fs';
const workflow=fs.readFileSync('.github/workflows/autonomous-builder-v3-gemini-free.yml','utf8');
if(!workflow.includes('npm run build'))throw new Error('Production build missing');
if(!workflow.includes('pr-quality-gate-runtime.mjs'))throw new Error('PR gate missing');
console.log('PASS AutoBot V3 build contract');
