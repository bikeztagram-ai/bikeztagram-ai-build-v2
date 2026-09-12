#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const file='src/captionPlanner.js';
const original=fs.readFileSync(file,'utf8');
let source=original;
try{
 if(!source.includes('export function filterCaptionCues')){
  source += `\nexport function filterCaptionCues(cues=[],options={}){\n const minimum=Number.isFinite(Number(options.minimumConfidence))?Number(options.minimumConfidence):.55;\n const maxChars=Number.isFinite(Number(options.maxChars))?Number(options.maxChars):72;\n return (Array.isArray(cues)?cues:[]).filter(c=>Number(c?.confidence??1)>=minimum).map(c=>({...c,text:String(c?.text||'').trim().slice(0,maxChars)})).filter(c=>c.text);\n}\n`;
 }
 const cueAnchor='const cues=normaliseSpeechCaptions(captions);';
 const cueWiring='const cues=filterCaptionCues(normaliseSpeechCaptions(captions),options);';
 if(source.includes(cueWiring)){
  console.log('[autobot] Caption safety helper already wired into planner.');
 }else{
  if(!source.includes(cueAnchor))throw new Error('caption planner cue anchor not found; refusing blind integration edit.');
  source=source.replace(cueAnchor,cueWiring);
  fs.writeFileSync(file,source);
  execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
  console.log('[autobot] Added and wired deterministic caption safety filtering.');
 }
}catch(error){
 fs.writeFileSync(file,original);
 console.error(`[autobot] Caption safety integration aborted safely; planner restored after validation/edit failure: ${error.message}`);
 process.exit(2);
}
