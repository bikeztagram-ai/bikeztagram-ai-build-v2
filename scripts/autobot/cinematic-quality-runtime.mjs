#!/usr/bin/env node
/** Add a deterministic shot-motion helper that respects shot intent. */
import fs from 'node:fs';
const file='src/director.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function buildShotMotion')){
 source+=`\nexport function buildShotMotion(shot={}){\n const type=lower(shot?.type||shot?.intent||'');\n if(type.includes('action')||type.includes('movement')) return {type:'push-pan',scale:1.08,duration:Number(shot.duration)||3};\n if(type.includes('hero')||type.includes('reveal')) return {type:'slow-push',scale:1.05,duration:Number(shot.duration)||3};\n return {type:'subtle-drift',scale:1.02,duration:Number(shot.duration)||3};\n}\n`;
}
fs.writeFileSync(file,source);
console.log('[autobot] Shot-specific cinematic motion helper added.');
