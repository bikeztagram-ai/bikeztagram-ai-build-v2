#!/usr/bin/env node
/** Verify the deterministic director-story integration tolerates normal formatting and is already-satisfied safe. */
import fs from 'node:fs';

const planner=fs.readFileSync('src/aiEditPlanner.js','utf8');
const runtime=fs.readFileSync('scripts/autobot/director-story-planner-runtime.mjs','utf8');
const failures=[];
if(!/const\s+storyBeats\s*=\s*buildDirectorStory\s*\(/.test(planner)) failures.push('planner storyBeats integration missing');
if(!/else\s+if\s*\(\s*storyBeats\.length\s*\)/.test(planner)) failures.push('planner storyBeats fallback missing');
if(!/directorSelection\s*:\s*directorSelectionFromCuts\(cuts\)\s*,/.test(planner)) failures.push('planner current directorSelection evidence missing');
if(!/const\s+storyBeats\s*=\s*buildDirectorStory\s*\(/.test(runtime) && !runtime.includes('storyBeats=buildDirectorStory(')) failures.push('runtime storyBeats detection/repair contract missing');
if(!/else\s+if\s*\(\s*storyBeats\.length\s*\)/.test(runtime) && !runtime.includes('else if(storyBeats.length)')) failures.push('runtime storyBeats fallback detection/repair contract missing');
if(!/directorSelection\s*:\s*directorSelectionFromCuts\(cuts\)\s*,/.test(runtime) && !runtime.includes('directorSelection:directorSelectionFromCuts(cuts),')) failures.push('runtime current evidence contract missing');
if(failures.length){console.error(failures.map(f=>`FAIL: ${f}`).join('\n'));process.exit(1);}
console.log('director-story-planner-idempotence: PASS');
