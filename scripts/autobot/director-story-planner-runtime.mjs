#!/usr/bin/env node
/** Feed deterministic story beats into the existing AI edit planner safely. */
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
if(!director.includes('export function buildDirectorStory')){
  throw new Error('director story prerequisite is still missing after deterministic prerequisite repair.');
}

if(!planner.includes("import { buildDirectorStory } from './director.js';")){
  const importAnchor="import { selectDirectorMoments } from './directorSelection.js';";
  if(!planner.includes(importAnchor)) throw new Error('director selection import anchor not found; refusing blind edit.');
  planner=planner.replace(importAnchor,`${importAnchor}\nimport { buildDirectorStory } from './director.js';`);
}

if(!/const\s+storyBeats\s*=\s*buildDirectorStory\s*\(/.test(planner)){
  const match=planner.match(/const\s+selectedMoments\s*=\s*selectDirectorMoments\([\s\S]*?\);\s*let\s+cuts\s*=\s*\[\];/);
  if(!match) throw new Error('selectedMoments structural boundary not found; refusing blind edit.');
  const replacement=match[0].replace(/;\s*let\s+cuts\s*=\s*\[\];$/,';const storyBeats=buildDirectorStory(rawMoments,{creativePrompt:options.creativePrompt,targetDuration});let cuts=[];');
  planner=planner.replace(match[0],replacement);
}

if(!/else\s+if\s*\(\s*storyBeats\.length\s*\)/.test(planner)){
  const marker=/}\s*else\s+if\s*\(\s*selectedMoments\.length\s*\)\s*\{/;
  const match=planner.match(marker);
  if(!match) throw new Error('selectedMoments fallback structural anchor not found; refusing blind edit.');
  planner=planner.replace(match[0],'}else if(storyBeats.length){cuts=storyBeats.map((moment,index)=>makeCut(moment,index,storyBeats.length,analysis,{...options,targetDuration},mode));}else if(selectedMoments.length){');
}

if(!/storyBeats\s*:\s*storyBeats\.map\s*\(/.test(planner)){
  const currentEvidence=/directorSelection\s*:\s*directorSelectionFromCuts\(cuts\)\s*,/;
  const legacyEvidence='directorSelection:selectedMoments.map((m)=>({sourceIndex:m.sourceIndex,mediaIndex:m.mediaIndex,mediaId:m.mediaId,score:m.directorSelectionScore}))';
  if(currentEvidence.test(planner)){
    planner=planner.replace(currentEvidence,m=>`${m}storyBeats:storyBeats.map((m)=>({mediaIndex:m.mediaIndex,role:m.directorStoryRole,score:m.directorStoryScore})),`);
  }else if(planner.includes(legacyEvidence)){
    planner=planner.replace(legacyEvidence,`${legacyEvidence},storyBeats:storyBeats.map((m)=>({mediaIndex:m.mediaIndex,role:m.directorStoryRole,score:m.directorStoryScore}))`);
  }else{
    throw new Error('director selection return evidence anchor not found in current or legacy planner shape; refusing blind edit.');
  }
}

write(plannerFile,planner);
console.log('[autobot] Director story planner integration applied against current planner evidence shape.');
