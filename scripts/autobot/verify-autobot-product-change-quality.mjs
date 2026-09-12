#!/usr/bin/env node
/**
 * AutoBot post-change product-quality guard.
 * Validates changed cinematic production paths without assuming that every
 * cinematic file change must also contain the director story subsystem.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const cinematicPaths=new Set(['src/director.js','src/aiEditPlanner.js','src/renderer.js','src/editorialRhythm.js','src/executableTimeline.js']);
function changedPaths(){
  const output=execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'});
  return output.split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);
}
function read(path){return fs.readFileSync(`${root}/${path}`,'utf8');}
function assert(condition,message){if(!condition)throw new Error(message);}
function richMedia(){return Array.from({length:8},(_,index)=>({id:`rich-${index}`,type:index%2?'video/mp4':'image/jpeg',name:['wide mountain establishing','rider approaching road','motorcycle cornering action','cockpit detail close-up','mountain landscape journey','bike accelerating speed','sunset motorcycle reveal','hero motorcycle showcase'][index],duration:index%2?4:0,width:1920,height:1080,score:75+index}));}
function sparseMedia(count){return Array.from({length:count},(_,index)=>({id:`sparse-${index}`,type:'image/jpeg',name:index===0?'single hero motorcycle':'detail motorcycle',width:1920,height:1080,score:80-index}));}

const changed=changedPaths();
const cinematicChanged=changed.filter(path=>cinematicPaths.has(path));
if(!cinematicChanged.length){
  console.log('autobot-product-change-quality: PASS not-applicable (no cinematic product files changed)');
  process.exit(0);
}

const planner=read('src/aiEditPlanner.js');
const director=read('src/director.js');
const storyIntegrationRequested=/buildDirectorStory|storyBeats/.test(planner)||changed.includes('src/director.js')&&/buildDirectorStory/.test(director);
let storyLength=null;
if(storyIntegrationRequested){
  assert(/export function buildDirectorStory\s*\(/.test(director),'director story guard failed: buildDirectorStory is referenced or changed but the canonical export is missing');
  const {buildDirectorStory}=await import('../../src/director.js');
  assert(typeof buildDirectorStory==='function','director story guard failed: canonical buildDirectorStory export is not callable');
  const one=buildDirectorStory(sparseMedia(1),{creativePrompt:'cinematic reveal',targetDuration:15});
  const two=buildDirectorStory(sparseMedia(2),{creativePrompt:'cinematic reveal',targetDuration:15});
  const rich=buildDirectorStory(richMedia(),{creativePrompt:'cinematic motorcycle journey with reveal and action',targetDuration:15});
  assert(one.length===1,`story scaling guard failed: one source produced ${one.length} beats`);
  assert(two.length===2,`story scaling guard failed: two sources produced ${two.length} beats`);
  assert(rich.length>=5,`story scaling guard failed: rich media produced only ${rich.length} story beats`);
  assert(rich.length<=8,`story scaling guard failed: produced ${rich.length} beats from 8 media items`);
  assert(new Set(rich.map(item=>item.mediaIndex)).size===rich.length,'story scaling guard failed: duplicate media indices');
  assert(rich.every(item=>item.directorStoryRole&&Number.isFinite(Number(item.directorStoryScore))),'story evidence guard failed: every selected beat lacks auditable role/score evidence');
  storyLength=rich.length;
}

if(/buildDirectorStory/.test(planner)||/storyBeats/.test(planner)){
  assert(/import\s*\{\s*buildDirectorStory\s*\}\s*from ['"]\.\/director\.js['"]/.test(planner),'production-path guard failed: aiEditPlanner.js does not import the canonical director story planner');
  assert(/const\s+storyBeats\s*=\s*buildDirectorStory\(/.test(planner),'production-path guard failed: aiEditPlanner.js does not construct story beats in the planner path');
  assert(/storyBeats\.map\(/.test(planner),'production-path guard failed: story beats are not consumed to construct auditable edit-plan evidence');
}

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

console.log(`autobot-product-change-quality: PASS cinematic guard; changed=${cinematicChanged.join(',')}; storyBeats=${storyLength??'not-applicable'}; production-path=${storyIntegrationRequested?'verified':'unchanged'}`);
