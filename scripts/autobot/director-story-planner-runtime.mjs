#!/usr/bin/env node
/** Feed deterministic story beats into the existing AI edit planner safely. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const plannerFile = 'src/aiEditPlanner.js';
const directorFile = 'src/director.js';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, source) { fs.writeFileSync(file, source); }
function run(file) {
  execFileSync(process.execPath, [file], { stdio: 'inherit' });
}

let planner = read(plannerFile);
let director = read(directorFile);

// The previous implementation trusted the checkpoint dependency state. A stale
// checkpoint could therefore attempt integration before the actual export existed.
// Repair the prerequisite from the canonical deterministic runtime when needed.
if (!director.includes('export function buildDirectorStory')) {
  run('scripts/autobot/director-story-runtime.mjs');
  director = read(directorFile);
}
if (!director.includes('export function buildDirectorStory')) {
  throw new Error('director story prerequisite is still missing after deterministic prerequisite repair.');
}

if (!planner.includes("import { buildDirectorStory } from './director.js';")) {
  const importAnchor = "import { selectDirectorMoments } from './directorSelection.js';";
  if (!planner.includes(importAnchor)) throw new Error('director selection import anchor not found; refusing blind edit.');
  planner = planner.replace(importAnchor, `${importAnchor}\nimport { buildDirectorStory } from './director.js';`);
}

if (!planner.includes('const storyBeats=buildDirectorStory(')) {
  const selectedPattern = /const\s+selectedMoments\s*=\s*selectDirectorMoments\([\s\S]*?\);/;
  const selected = planner.match(selectedPattern);
  if (!selected) throw new Error('selectedMoments call boundary not found; refusing blind edit.');
  const storyCall = `${selected[0]};const storyBeats=buildDirectorStory(rawMoments,{creativePrompt:options.creativePrompt,targetDuration});`;
  planner = planner.replace(selected[0], storyCall);
}

if (!planner.includes('else if(storyBeats.length)')) {
  const fallbackPattern = /else\s+if\s*\(selectedMoments\.length\)\s*\{\s*cuts\s*=\s*selectedMoments\.map\([\s\S]*?\);\s*\}/;
  const fallback = planner.match(fallbackPattern);
  if (!fallback) throw new Error('selectedMoments fallback anchor not found; refusing blind edit.');
  const original = fallback[0];
  const story = `else if(storyBeats.length){cuts=storyBeats.map((moment,index)=>makeCut(moment,index,storyBeats.length,analysis,{...options,targetDuration},mode));}`;
  planner = planner.replace(original, `${story}${original}`);
}

if (!planner.includes('storyBeats:storyBeats.map(')) {
  const returnPattern = /directorSelection\s*:\s*selectedMoments\.map\(\(m\)=>\(\{mediaIndex:m\.mediaIndex,mediaId:m\.mediaId,score:m\.directorSelectionScore\}\)\)/;
  const returned = planner.match(returnPattern);
  if (!returned) throw new Error('director selection return evidence anchor not found; refusing blind edit.');
  planner = planner.replace(returned[0], `${returned[0]},storyBeats:storyBeats.map((m)=>({mediaIndex:m.mediaIndex,role:m.directorStoryRole,score:m.directorStoryScore}))`);
}

write(plannerFile, planner);
console.log('[autobot] Director story planner integration hardened and applied.');
