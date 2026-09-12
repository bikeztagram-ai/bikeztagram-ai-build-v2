#!/usr/bin/env node
/** Feed deterministic story beats into the existing AI edit planner safely. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const plannerFile='src/aiEditPlanner.js';
const directorFile='src/director.js';
const read=file=>fs.readFileSync(file,'utf8');
const write=(file,source)=>fs.writeFileSync(file,source);
const run=file=>execFileSync(process.execPath,[file],{stdio:'inherit'});
const checkSyntax=file=>execFileSync(process.execPath,['--check',file],{stdio:'inherit'});

let planner=read(plannerFile);
let director=read(directorFile);
if(!director.includes('export function buildDirectorStory')){
  run('scripts/autobot/director-story-runtime.mjs');
  director=read(directorFile);
}
if(!director.includes('export function buildDirectorStory'))throw new Error('director story prerequisite is still missing after deterministic prerequisite repair.');

const originalPlanner=planner;
try{
  if(!planner.includes("import { buildDirectorStory } from './director.js';")){
    const importAnchor="import { selectDirectorMoments } from './directorSelection.js';";
    if(!planner.includes(importAnchor))throw new Error('director selection import anchor not found; refusing blind edit.');
    planner=planner.replace(importAnchor,`${importAnchor}\nimport { buildDirectorStory } from './director.js';`);
  }

  const storyDeclaration="const storyBeats=buildDirectorStory(rawMoments,{creativePrompt:options.creativePrompt,targetDuration});";
  if(!planner.includes(storyDeclaration)){
    const selectionBlock="const selectedMoments=selectDirectorMoments(rawMoments,{maxCuts:clamp(num(options.maxCuts,8),1,30),targetDuration,creativePrompt:options.creativePrompt});let cuts=[];";
    if(!planner.includes(selectionBlock))throw new Error('selectedMoments declaration anchor not found; refusing blind edit.');
    planner=planner.replace(selectionBlock,`${selectionBlock.replace(';let cuts=[];',';')}${storyDeclaration}let cuts=[];`);
  }

  const storyFallbackMarker='}else if(storyBeats.length){';
  const selectedFallbackMarker='}else if(selectedMoments.length){';
  if(!planner.includes(storyFallbackMarker)){
    if(!planner.includes(selectedFallbackMarker))throw new Error('selectedMoments fallback structural anchor not found; refusing blind edit.');
    const replacement=`${storyFallbackMarker}cuts=storyBeats.map((moment,index)=>makeCut(moment,index,storyBeats.length,analysis,{...options,targetDuration},mode));}`;
    planner=planner.replace(selectedFallbackMarker,`${replacement}else if(selectedMoments.length){`);
  }
  if(planner.indexOf(storyFallbackMarker)>planner.indexOf(selectedFallbackMarker))throw new Error('director story fallback must run before the generic selectedMoments fallback; refusing to leave dead story intelligence.');

  if(!planner.includes('storyBeats:storyBeats.map(')){
    const currentEvidence='directorSelection:directorSelectionFromCuts(cuts),';
    const legacyEvidence='directorSelection:selectedMoments.map((m)=>({sourceIndex:m.sourceIndex,mediaIndex:m.mediaIndex,mediaId:m.mediaId,score:m.directorSelectionScore}))';
    if(planner.includes(currentEvidence))planner=planner.replace(currentEvidence,`${currentEvidence}storyBeats:storyBeats.map((m)=>({mediaIndex:m.mediaIndex,role:m.directorStoryRole,score:m.directorStoryScore})),`);
    else if(planner.includes(legacyEvidence))planner=planner.replace(legacyEvidence,`${legacyEvidence},storyBeats:storyBeats.map((m)=>({mediaIndex:m.mediaIndex,role:m.directorStoryRole,score:m.directorStoryScore}))`);
    else throw new Error('director selection return evidence anchor not found in current or legacy planner shape; refusing blind edit.');
  }

  write(plannerFile,planner);
  checkSyntax(plannerFile);
  console.log('[autobot] Director story planner integration applied and syntax-validated.');
}catch(error){
  write(plannerFile,originalPlanner);
  throw new Error(`director-story-planner integration aborted safely; planner restored after validation/edit failure: ${error.message}`);
}
