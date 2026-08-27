#!/usr/bin/env node
import fs from 'node:fs';
const file='src/aiEditPlanner.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function scoreDirectorContinuity')){
 source += `\nexport function scoreDirectorContinuity(cuts=[]){\n if(!Array.isArray(cuts)||!cuts.length)return {score:0,issues:['no-cuts']};\n const roles=cuts.map(c=>String(c?.purpose||'unknown'));\n const repeats=roles.length-new Set(roles).size;\n const endings=roles.filter(r=>/hero|ending|outro/i.test(r)).length;\n const openings=roles.filter(r=>/opening|hook|build/i.test(r)).length;\n const issues=[];\n if(!openings)issues.push('missing-opening');\n if(!endings)issues.push('missing-ending');\n if(repeats>Math.floor(cuts.length/2))issues.push('repetitive-roles');\n return {score:Math.max(0,100-issues.length*20-repeats*5),issues};\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added director continuity score helper.');
} else console.log('[autobot] Director continuity helper already present.');
