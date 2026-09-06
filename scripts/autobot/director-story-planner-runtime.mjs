#!/usr/bin/env node
/** Feed deterministic story beats into the existing AI edit planner with structural anchors. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const plannerFile='src/aiEditPlanner.js',directorFile='src/director.js';
const read=file=>fs.readFileSync(file,'utf8'),write=(file,source)=>fs.writeFileSync(file,source),run=file=>execFileSync(process.execPath,[file],{stdio:'inherit'});
let planner=read(plannerFile),director=read(directorFile);
if(!director.includes('export function buildDirectorStory')){run('scripts/autobot/director-story-runtime.mjs');director=read(directorFile)}
if(!director.includes('export function buildDirectorStory'))throw new Error('director story prerequisite is still missing after deterministic prerequisite repair.');
if(!planner.includes("import { buildDirectorStory } from './director.js';")){const importAnchor="import { selectDirectorMoments } from './directorSelection.js';";if(!planner.includes(importAnchor))throw new Error('director selection import anchor not found; refusing blind edit.');planner=planner.replace(importAnchor,`${importAnchor}\nimport { buildDirectorStory } from './director.js';`)}
if(!planner.includes('const storyBeats=buildDirectorStory(')){const match=planner.match(/const\s+selectedMoments\s*=\s*selectDirectorMoments\([\s\S]*?\);\s*let\s+cuts\s*=\s*\[\];/);if(!match)throw new Error('selectedMoments structural boundary not found; refusing blind edit.');planner=planner.replace(match[0],`${match[0].replace(/\s*let\s+cuts\s*=\s*\[\];$/,'')};const storyBeats=buildDirectorStory(rawMoments,{creativePrompt:options.creativePrompt,targetDuration});let cuts=[];`)}
if(!planner.includes('else if(storyBeats.length)')){const marker='}else if(selectedMoments.length){';if(!planner.includes(marker))throw new Error('selectedMoments fallback structural anchor not found; refusing blind edit.');planner=planner.replace(marker,'}else if(storyBeats.length){cuts=storyBeats.map((moment,index)=>makeCut(moment,index,storyBeats.length,analysis,{...options,targetDuration},mode));}else if(selectedMoments.length){')}
if(!planner.includes('storyBeats:storyBeats.map(')){const returnMatch=planner.match(/directorSelection\s*:\s*selectedMoments\.map\(\(m\)=>\(\{sourceIndex:m\.sourceIndex,mediaIndex:m\.mediaIndex,mediaId:m\.mediaId,score:m\.directorSelectionScore\}\)\)/);if(!returnMatch)throw new Error('director selection return evidence anchor not found; refusing blind edit.');planner=planner.replace(returnMatch[0],`${returnMatch[0]},storyBeats:storyBeats.map((m)=>({mediaIndex:m.mediaIndex,role:m.directorStoryRole,score:m.directorStoryScore}))`)}
write(plannerFile,planner);console.log('[autobot] Director story planner integration hardened and applied.');
