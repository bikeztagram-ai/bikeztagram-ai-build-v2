import fs from 'node:fs';
if(!fs.existsSync('builder/brain/strategic-planner.mjs'))throw new Error('Strategic planner missing');
if(!fs.existsSync('.github/workflows/autonomous-builder-v3-gemini-free.yml'))throw new Error('V3 workflow missing');
console.log('PASS AutoBot V3 finish summary check');
