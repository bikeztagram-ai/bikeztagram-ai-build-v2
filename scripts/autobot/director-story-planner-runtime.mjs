#!/usr/bin/env node
/** Feed deterministic story beats into the existing AI edit planner. */
import fs from 'node:fs';
const file='src/aiEditPlanner.js';
let source=fs.readFileSync(file,'utf8');
if(source.includes('buildDirectorStory')){console.log('[autobot] Director story integration already present.');process.exit(0);}
const importAnchor="import { selectDirectorMoments } from './directorSelection.js';";
if(!source.includes(importAnchor))throw new Error('director selection import anchor not found; refusing blind edit.');
source=source.replace(importAnchor,importAnchor+"\nimport { buildDirectorStory } from './director.js';");
const anchor='const selectedMoments=selectDirectorMoments(rawMoments,{maxCuts:';
const at=source.indexOf(anchor);
if(at<0)throw new Error('selectedMoments anchor not found; refusing blind edit.');
const end=source.indexOf('});',at);
if(end<0)throw new Error('selectedMoments call boundary not found; refusing blind edit.');
const callEnd=end+3;
const replacement=source.slice(at,callEnd)+";const storyBeats=buildDirectorStory(rawMoments,{creativePrompt:options.creativePrompt,targetDuration});";
source=source.slice(0,at)+replacement+source.slice(callEnd);
const cutsAnchor='}else if(selectedMoments.length){cuts=selectedMoments.map((moment,index)=>makeCut(moment,index,selectedMoments.length,analysis,{...options,targetDuration},mode));}';
if(!source.includes(cutsAnchor))throw new Error('selectedMoments fallback anchor not found; refusing blind edit.');
source=source.replace(cutsAnchor,"}else if(storyBeats.length){cuts=storyBeats.map((moment,index)=>makeCut(moment,index,storyBeats.length,analysis,{...options,targetDuration},mode));}else if(selectedMoments.length){cuts=selectedMoments.map((moment,index)=>makeCut(moment,index,selectedMoments.length,analysis,{...options,targetDuration},mode));}");
const returnAnchor="directorSelection:selectedMoments.map((m)=>({mediaIndex:m.mediaIndex,mediaId:m.mediaId,score:m.directorSelectionScore}))";
if(!source.includes(returnAnchor))throw new Error('director selection return anchor not found; refusing blind edit.');
source=source.replace(returnAnchor,returnAnchor+",storyBeats:storyBeats.map((m)=>({mediaIndex:m.mediaIndex,role:m.directorStoryRole,score:m.directorStoryScore}))");
fs.writeFileSync(file,source);console.log('[autobot] Integrated deterministic story beats into AI edit planning.');
