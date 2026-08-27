#!/usr/bin/env node
import fs from 'node:fs';
const file='src/captionPlanner.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function filterCaptionCues')){
 source += `\nexport function filterCaptionCues(cues=[],options={}){\n const minimum=Number.isFinite(Number(options.minimumConfidence))?Number(options.minimumConfidence):.55;\n const maxChars=Number.isFinite(Number(options.maxChars))?Number(options.maxChars):72;\n return (Array.isArray(cues)?cues:[]).filter(c=>Number(c?.confidence??1)>=minimum).map(c=>({...c,text:String(c?.text||'').trim().slice(0,maxChars)})).filter(c=>c.text);\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added deterministic caption safety filtering.');
} else console.log('[autobot] Caption safety helper already present.');
