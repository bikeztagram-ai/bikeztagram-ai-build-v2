#!/usr/bin/env node
/** Feed deterministic story beats into the current AI edit planner with structural anchors. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const plannerFile='src/aiEditPlanner.js';
const directorFile='src/director.js';
const read=file=>fs.readFileSync(file,'utf8');
const write=(file,source)=>fs.writeFileSync(file,source);
const run=file=>execFileSync(process.execPath,[file],{stdio:'inherit'});

let planner=read(plannerFile);
let director=read(directorFile);

if(!director.includes('export function buildDirectorStory')){
  run('scripts/autobot/director-story-runtime.mjs');
  director=read(directorFile);
}
if(!director.includes('export function buildDirectorStory'))
  throw new Error('director story prerequisite is still missing after deterministic prerequisite repair.');

const importAnchor="import { selectDirectorMoments } from './directorSelection.js';";
if(!planner.includes("import { buildDirectorStory } from './director.js';")){
  if(!planner.includes(importAnchor)) throw new Error('director selection import anchor not found; refusing blind edit.');
  planner=planner.replace(importAnchor,`${importAnchor}\nimport { buildDirectorStory } from './director.js';`);
}

if(!planner.includes('const storyBeats=buildDirectorStory(')){
  const selectedAnchor=/const\s+selectedMoments\s*=\s*selectDirectorMoments\([\s\S]*?\);/;
  const match=planner.match(selectedAnchor);
  if(!match) throw new Error('selectedMoments structural boundary not found; refusing blind edit.');
  const replacement=`${match[0]}\n  const storyBeats=buildDirectorStory(rawMoments,{creativePrompt:options.creativePrompt,targetDuration});`;
  planner=planner.replace(match[0],replacement);
}

if(!planner.includes('storyBeats.length')){
  const fallbackAnchor='}else if(selectedMoments.length){';
  if(planner.includes(fallbackAnchor)){
    planner=planner.replace(fallbackAnchor,'}else if(storyBeats.length){cuts=storyBeats.map((moment,index)=>makeCut(moment,index,storyBeats.length,analysis,{...options,targetDuration},mode));}else if(selectedMoments.length){');
  }else{
    const selectionMap=/}else\s+cuts=selectedMoments\.map\(\(moment,index\)=>makeCut\(moment,index,selectedMoments\.length,analysis,\{\.\.\.options,targetDuration\},mode\);/;
    const match=planner.match(selectionMap);
    if(!match) throw new Error('selectedMoments cut-selection boundary not found; refusing blind edit.');
    planner=planner.replace(match[0],`${match[0]}\n  if(storyBeats.length) cuts=storyBeats.map((moment,index)=>makeCut(moment,index,storyBeats.length,analysis,{...options,targetDuration},mode));`);
  }
}

if(!planner.includes('storyBeats:storyBeats.map(')){
  const returnAnchor='directorSelection:directorSelectionFromCuts(cuts),';
  if(!planner.includes(returnAnchor)) throw new Error('current director selection return anchor not found; refusing blind edit.');
  planner=planner.replace(returnAnchor,`${returnAnchor}\n    storyBeats:storyBeats.map((m)=>({mediaIndex:m.mediaIndex,role:m.directorStoryRole,score:m.directorStoryScore})),`);
}

write(plannerFile,planner);
console.log('[autobot] Director story planner integration aligned with current planner structure.');
