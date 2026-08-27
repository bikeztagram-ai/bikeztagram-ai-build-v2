#!/usr/bin/env node
import fs from 'node:fs';
const file='src/socialExport.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function getSocialExportProfiles')){
 source += `\nexport function getSocialExportProfiles(){\n return Object.freeze(Object.fromEntries(Object.entries(SOCIAL_PRESETS).map(([id,p])=>[id,{id,label:p.label,width:p.width,height:p.height,aspectRatio:p.aspectRatio,platforms:[...(p.platforms||[])]}])));\n}\n`;
}
fs.writeFileSync(file,source);
console.log('[autobot] Added deterministic social export profile metadata API.');
