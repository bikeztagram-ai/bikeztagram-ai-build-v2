#!/usr/bin/env node
import fs from 'node:fs';
const file='src/aiEditPlanner.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function scoreCinematicPacing')){
 source += `\nexport function scoreCinematicPacing(cuts=[]){\n if(!Array.isArray(cuts)||!cuts.length)return {score:0,issues:['no-cuts']};\n const durations=cuts.map(c=>Number(c?.duration)||0);\n const motion=cuts.filter(c=>c?.motionStyle&&c.motionStyle!=='static').length;\n const transitions=cuts.filter(c=>c?.transition&&c.transition!=='hard-cut').length;\n const variation=new Set(cuts.map(c=>c?.purpose||'unknown')).size;\n const avg=durations.reduce((a,b)=>a+b,0)/durations.length;\n const issues=[];\n if(motion===0)issues.push('no-motion');\n if(variation<Math.min(3,cuts.length))issues.push('low-story-variation');\n if(avg>4.5)issues.push('slow-average-cut');\n return {score:Math.max(0,Math.min(100,55+Math.min(20,motion*4)+Math.min(15,transitions*3)+Math.min(10,variation*3)-issues.length*8)),issues};\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added cinematic pacing score helper.');
} else console.log('[autobot] Cinematic pacing helper already present.');
