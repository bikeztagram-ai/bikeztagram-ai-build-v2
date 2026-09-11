#!/usr/bin/env node
/**
 * AutoBot post-change product-quality guard.
 * Runs against the current worktree after a feature pass. It deliberately
 * skips when no cinematic product file changed, but becomes a hard gate when
 * a cinematic change is present. This prevents passing builds from hiding
 * fixed-role story ceilings or dead quality helpers.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildDirectorStory } from '../../src/director.js';

const root=process.cwd();
const cinematicPaths=new Set(['src/director.js','src/aiEditPlanner.js','src/renderer.js','src/editorialRhythm.js','src/executableTimeline.js']);
function changedPaths(){
  const output=execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'});
  return output.split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);
}
function read(path){return fs.readFileSync(`${root}/${path}`,'utf8');}
function assert(condition,message){if(!condition)throw new Error(message);}

const changed=changedPaths();
const cinematicChanged=changed.filter(path=>cinematicPaths.has(path));
if(!cinematicChanged.length){
  console.log('autobot-product-change-quality: PASS not-applicable (no cinematic product files changed)');
  process.exit(0);
}

const media=Array.from({length:8},(_,index)=>({
  id:`rich-${index}`,
  type:index%2?'video/mp4':'image/jpeg',
  name:['wide mountain establishing','rider approaching road','motorcycle cornering action','cockpit detail close-up','mountain landscape journey','bike accelerating speed','sunset motorcycle reveal','hero motorcycle showcase'][index],
  duration:index%2?4:0,
  width:1920,
  height:1080,
  score:75+index
}));
const story=buildDirectorStory(media,{creativePrompt:'cinematic motorcycle journey with reveal and action',targetDuration:15});
assert(story.length>=5,`dynamic story guard failed: rich media produced only ${story.length} story beats`);
assert(story.length<=media.length,`dynamic story guard failed: produced ${story.length} beats from ${media.length} media items`);
assert(new Set(story.map(item=>item.mediaIndex)).size===story.length,'dynamic story guard failed: duplicate media indices');

const planner=read('src/aiEditPlanner.js');
assert(/buildDirectorStory/.test(planner),'production-path guard failed: aiEditPlanner.js does not reference buildDirectorStory');
assert(/storyBeats/.test(planner)&&/storyBeats\.map/.test(planner),'production-path guard failed: story beats are not consumed to construct the edit cuts');

const director=read('src/director.js');
if(/export function scoreDirectorContinuity\s*\(/.test(director)){
  const srcFiles=execFileSync('git',['ls-files','src'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  const references=srcFiles.reduce((count,path)=>count+(read(path).match(/scoreDirectorContinuity\s*\(/g)||[]).length,0);
  assert(references>=2,'dead-intelligence guard failed: scoreDirectorContinuity is exported but not consumed by production code');
}

for(const helper of ['filterCaptionCues','normaliseCaptionTiming']){
  const captionPath='src/captionPlanner.js';
  if(!changed.includes(captionPath))continue;
  const srcFiles=execFileSync('git',['ls-files','src'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  const references=srcFiles.reduce((count,path)=>count+(read(path).match(new RegExp(`${helper}\\s*\\(`,'g'))||[]).length,0);
  assert(references>=2,`dead-intelligence guard failed: ${helper} is exported but not consumed by production code`);
}

console.log(`autobot-product-change-quality: PASS cinematic guard; changed=${cinematicChanged.join(',')}; storyBeats=${story.length}; production-path=verified`);
