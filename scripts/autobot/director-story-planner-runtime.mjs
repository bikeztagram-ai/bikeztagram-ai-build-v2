#!/usr/bin/env node
/** Feed deterministic story beats into the existing AI edit planner safely. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const plannerFile='src/aiEditPlanner.js';
const directorFile='src/director.js';
const read=f=>fs.readFileSync(f,'utf8');
const write=(f,s)=>fs.writeFileSync(f,s);
const run=f=>execFileSync(process.execPath,[f],{stdio:'inherit'});
let planner=read(plannerFile);
let director=read(directorFile);
if(!director.includes('export function buildDirectorStory')){run('scripts/autobot/director-story-runtime.mjs');director=read(directorFile);}
if(!director.includes('export function buildDirectorStory'))throw new Error('director story prerequisite is still missing after deterministic prerequisite repair.');
if(!planner.includes("import { buildDirectorStory } from './director.js';")){const a="import { selectDirectorMoments } from './directorSelection.js';";if(!planner.includes(a))throw new Error('director selection import anchor not found; refusing blind edit.');planner=planner.replace(a,`${a}\nimport { buildDirectorStory } from './director.js';`);}
if(!planner.includes('const storyBeats=buildDirectorStory(')){const m=planner.match(/const\s+selectedMoments\s*=\s*selectDirectorMoments\([\s\S]*?\);/);if(!m)throw new Error('selectedMoments call boundary not found; refusing blind edit.');planner=planner.replace(m[0],`${m[0]}const storyBeats=buildDirectorStory(rawMoments,{creativePrompt:options.creativePrompt,targetDuration});`);}
if(!planner.includes('else if(storyBeats.length)')){const m=planner.match(/else\s+if\s*\(selectedMoments\.length\)\s*\{\s*cuts\s*=\s*selectedMoments\.map\([\s\S]*?\);\s*\}/);if(!m)throw new Error('selectedMoments fallback anchor not found; refusing blind edit.');const story='else if(storyBeats.length){cuts=storyBeats.map((moment,index)=>makeCut(moment,index,storyBeats.length,analysis,{...options,targetDuration},mode));}';planner=planner.replace(m[0],`${story}${m[0]}`);}
if(!planner.includes('storyBeats:storyBeats.map(')){const m=planner.match(/directorSelection\s*:\s*selectedMoments\.map\(\(m\)=>\(\{mediaIndex:m\.mediaIndex,mediaId:m\.mediaId,score:m\.directorSelectionScore\}\)\)/);if(!m)throw new Error('director selection return evidence anchor not found; refusing blind edit.');planner=planner.replace(m[0],`${m[0]},storyBeats:storyBeats.map((m)=>({mediaIndex:m.mediaIndex,role:m.directorStoryRole,score:m.directorStoryScore}))`);}
write(plannerFile,planner);
console.log('[autobot] Director story planner integration hardened and applied.');
