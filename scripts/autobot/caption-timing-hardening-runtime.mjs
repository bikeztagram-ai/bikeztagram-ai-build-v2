#!/usr/bin/env node
import fs from 'node:fs';
const file='src/captionPlanner.js';
const original=fs.readFileSync(file,'utf8');
let source=original;
try{
 if(!source.includes('export function normaliseCaptionTiming')){
  source += `\nexport function normaliseCaptionTiming(cues=[]){\n return (Array.isArray(cues)?cues:[]).map(c=>{\n  const start=Math.max(0,Number(c?.start??c?.startTime)||0);\n  const end=Math.max(start+.05,Number(c?.end??c?.endTime)||start+.8);\n  return {...c,start:Number(start.toFixed(3)),end:Number(end.toFixed(3)),duration:Number((end-start).toFixed(3))};\n });\n}\n`;
 }
 const cueAnchor='const cues=filterCaptionCues(normaliseSpeechCaptions(captions),options);';
 const cueWiring='const cues=normaliseCaptionTiming(filterCaptionCues(normaliseSpeechCaptions(captions),options));';
 if(source.includes(cueWiring)){
  console.log('[autobot] Caption timing helper already wired into planner.');
 }else{
  if(!source.includes(cueAnchor))throw new Error('caption safety wiring anchor not found; caption timing depends on caption safety integration.');
  source=source.replace(cueAnchor,cueWiring);
  fs.writeFileSync(file,source);
  console.log('[autobot] Added and wired deterministic caption timing normalisation.');
 }
}catch(error){
 fs.writeFileSync(file,original);
 console.error(`[autobot] Caption timing integration aborted safely; planner restored after validation/edit failure: ${error.message}`);
 process.exit(2);
}
