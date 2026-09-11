#!/usr/bin/env node
/** Regression contract for deterministic story-planner integration against current and legacy planner shapes. */
import fs from 'node:fs';

const runtime=fs.readFileSync('scripts/autobot/director-story-planner-runtime.mjs','utf8');
const planner=fs.readFileSync('src/aiEditPlanner.js','utf8');
const failures=[];
const requiredRuntime=[
  'export function buildDirectorStory',
  'const storyBeats=buildDirectorStory(',
  "}else if(selectedMoments.length){",
  'directorSelection:directorSelectionFromCuts(cuts),',
  'directorSelection:selectedMoments.map((m)=>({sourceIndex:m.sourceIndex,mediaIndex:m.mediaIndex,mediaId:m.mediaId,score:m.directorSelectionScore}))'
];
for(const marker of requiredRuntime)if(!runtime.includes(marker))failures.push(`runtime missing ${marker}`);
if(!runtime.includes('const currentEvidence='))failures.push('runtime lacks current planner evidence anchor');
if(!runtime.includes('const legacyEvidence='))failures.push('runtime lacks legacy planner evidence anchor');
if(!planner.includes("import { selectDirectorMoments } from './directorSelection.js';"))failures.push('current planner selection import anchor missing');
if(!planner.includes('directorSelection:directorSelectionFromCuts(cuts),'))failures.push('current planner directorSelection evidence shape missing');
if(failures.length){console.error(failures.map(f=>`FAIL: ${f}`).join('\n'));process.exit(1);}
console.log('director-story-planner-runtime contract PASS: current and legacy planner evidence anchors are supported.');
