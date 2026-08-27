#!/usr/bin/env node
import fs from 'node:fs';
const file='src/captionPlanner.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function normaliseCaptionTiming')){
 source += `\nexport function normaliseCaptionTiming(cues=[]){\n return (Array.isArray(cues)?cues:[]).map(c=>{\n  const start=Math.max(0,Number(c?.start??c?.startTime)||0);\n  const end=Math.max(start+.05,Number(c?.end??c?.endTime)||start+.8);\n  return {...c,start:Number(start.toFixed(3)),end:Number(end.toFixed(3)),duration:Number((end-start).toFixed(3))};\n });\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added deterministic caption timing normalisation.');
} else console.log('[autobot] Caption timing helper already present.');
