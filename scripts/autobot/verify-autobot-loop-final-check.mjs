import fs from 'node:fs';
if(!fs.existsSync('.github/workflows/autonomous-builder-v3-gemini-free.yml'))throw new Error('V3 workflow missing');
if(!fs.existsSync('builder/brain/strategic-planner.mjs'))throw new Error('Strategic brain missing');
console.log('PASS final AutoBot V3 check');
