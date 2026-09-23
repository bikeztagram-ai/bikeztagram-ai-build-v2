#!/usr/bin/env node
/** AutoBot post-change product-quality guard for changed cinematic production paths. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const cinematicPaths=new Set(['src/director.js','src/aiEditPlanner.js','src/renderer.js','src/editorialRhythm.js','src/executableTimeline.js','src/captionPlanner.js','src/musicDirector.js','src/universalCreativeSceneEngine.js','src/cinematicRendererV3.js','src/creativeIntentCompiler.js','src/creativeContinuityEngine.js']);
function changedPaths(){
  const base=String(process.env.AUTOBOT_PRODUCT_QUALITY_BASE_COMMIT||'').trim();
  const candidate=String(process.env.AUTOBOT_PRODUCT_QUALITY_CANDIDATE_COMMIT||'').trim();
  if(base&&candidate&&/^[0-9a-f]{40}$/i.test(base)&&/^[0-9a-f]{40}$/i.test(candidate)){
    try{
      return execFileSync('git',['diff','--name-only',base,candidate],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean).map(x=>x.trim()).filter(Boolean);
    }catch(error){throw new Error('cannot inspect committed candidate diff '+base+'..'+candidate+': '+error.message);}
  }
  const output=execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'});
  return output.split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim()).filter(Boolean);
}
function read(path){return fs.readFileSync(`${root}/${path}`,'utf8');}
function assert(condition,message){if(!condition)throw new Error(message);}
function duplicateTopLevelFunctionNames(source){
  const counts=new Map();
  const pattern=/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let match;
  while((match=pattern.exec(source))!==null)counts.set(match[1],(counts.get(match[1])||0)+1);
  return [...counts.entries()].filter(([,count])=>count>1).map(([name,count])=>({name,count}));
}
function assertNoDuplicateTopLevelFunctions(file){
  const duplicates=duplicateTopLevelFunctionNames(read(file));
  assert(!duplicates.length,`duplicate-function-declaration guard failed in ${file}: ${duplicates.map(item=>item.name+' x'+item.count).join(', ')}`);
}
function duplicateTopLevelBindingNames(source){
  const counts=new Map();
  const patterns=[/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm,/^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/gm];
  for(const pattern of patterns){let match;while((match=pattern.exec(source))!==null)counts.set(match[1],(counts.get(match[1])||0)+1);}
  return [...counts.entries()].filter(([,count])=>count>1).map(([name,count])=>({name,count}));
}
function assertNoDuplicateTopLevelBindings(file){
  const duplicates=duplicateTopLevelBindingNames(read(file));
  assert(!duplicates.length,`duplicate-top-level-binding guard failed in ${file}: ${duplicates.map(item=>item.name+' x'+item.count).join(', ')}`);
}
function publicExportNames(source){
  const names=new Set();
  const patterns=[
    /\\bexport\\s+(?:async\\s+)?function\\s+([A-Za-z_$][\\w$]*)/g,
    /\\bexport\\s+(?:const|let|var|class)\\s+([A-Za-z_$][\\w$]*)/g,
    /\\bexport\\s+default\\b/g
  ];
  for(const pattern of patterns){let match;while((match=pattern.exec(source))!==null)names.add(match[1]||'default');}
  for(const match of source.matchAll(/\\bexport\\s*\\{([^}]+)\\}/g)){
    for(const entry of match[1].split(',')){const name=entry.trim().split(/\\s+as\\s+/i)[0].trim();if(name)names.add(name);}
  }
  return names;
}
function assertPublicExportsPreserved(file){
  const base=String(process.env.AUTOBOT_PRODUCT_QUALITY_BASE_COMMIT||'').trim();
  if(!base||!/^[0-9a-f]{40}$/i.test(base))return;
  let baseSource='';
  try{baseSource=execFileSync('git',['show',`${base}:${file}`],{cwd:root,encoding:'utf8'});}catch{return;}
  const missing=[...publicExportNames(baseSource)].filter(name=>!publicExportNames(read(file)).has(name));
  assert(!missing.length,`public-export guard failed in ${file}: existing exports removed: ${missing.join(', ')}`);
}
function assertNoUnusedAddedTopLevelConstants(file){
  const base=String(process.env.AUTOBOT_PRODUCT_QUALITY_BASE_COMMIT||'').trim();
  const candidate=String(process.env.AUTOBOT_PRODUCT_QUALITY_CANDIDATE_COMMIT||'').trim();
  let diff='';
  try{
    const args=base&&candidate&&/^[0-9a-f]{40}$/i.test(base)&&/^[0-9a-f]{40}$/i.test(candidate)
      ? ['diff','--unified=0',base,candidate,'--',file]
      : ['diff','--unified=0','--',file];
    diff=execFileSync('git',args,{cwd:root,encoding:'utf8'});
  }catch{}
  const additions=[...diff.matchAll(/^\+const\s+([A-Za-z_$][\w$]*)\s*=/gm)].map(match=>match[1]);
  if(!additions.length)return;
  const source=read(file);
  for(const name of additions){
    const uses=source.match(new RegExp('\\b'+name+'\\b','g'))||[];
    assert(uses.length>=2,`dead-change guard failed in ${file}: added top-level constant ${name} is not consumed by the production file`);
  }
}
function richMedia(){return Array.from({length:12},(_,index)=>({id:`rich-${index}`,type:index%2?'video/mp4':'image/jpeg',name:['wide mountain establishing','rider approaching road','motorcycle cornering action','cockpit detail close-up','mountain landscape journey','bike accelerating speed','sunset motorcycle reveal','hero motorcycle showcase','roadside landscape detail','rider departure movement','mountain road action','final motorcycle hero'][index],duration:index%2?4:0,width:1920,height:1080,score:75+index}));}
function sparseMedia(count){return Array.from({length:count},(_,index)=>({id:`sparse-${index}`,type:'image/jpeg',name:index===0?'single hero motorcycle':'detail motorcycle',width:1920,height:1080,score:80-index}));}

const changed=changedPaths();
const cinematicChanged=changed.filter(path=>cinematicPaths.has(path));
for(const file of cinematicChanged){assertNoDuplicateTopLevelFunctions(file);assertNoDuplicateTopLevelBindings(file);assertNoUnusedAddedTopLevelConstants(file);assertPublicExportsPreserved(file);}
if(!cinematicChanged.length){console.log('autobot-product-change-quality: PASS not-applicable (no cinematic product files changed)');process.exit(0);}

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
  const rich=buildDirectorStory(richMedia(),{creativePrompt:'cinematic motorcycle journey with reveal and action',targetDuration:30});
  assert(one.length===1,`story scaling guard failed: one source produced ${one.length} beats`);
  assert(two.length===2,`story scaling guard failed: two sources produced ${two.length} beats`);
  assert(rich.length===12,`story scaling guard failed: 12 available sources at 30s produced ${rich.length} story beats`);
  assert(new Set(rich.map(item=>item.mediaIndex)).size===rich.length,'story scaling guard failed: duplicate media indices');
  assert(rich.every(item=>item.directorStoryRole&&Number.isFinite(Number(item.directorStoryScore))),'story evidence guard failed: every selected beat lacks auditable role/score evidence');
  storyLength=rich.length;
}

if(changed.includes('src/aiEditPlanner.js')){
  const {createAIEditPlan}=await import('../../src/aiEditPlanner.js');
  assert(typeof createAIEditPlan==='function','media-intelligence runtime guard failed: createAIEditPlan export is not callable');
  const smokeAnalysis={
    durationInSeconds:11,
    mediaType:'video',
    subject:{label:'motorcycle',category:'vehicle'},
    bestMoments:[
      {mediaIndex:0,sourceIndex:0,mediaId:'smoke-0',start:0,end:3,duration:3,description:'motorcycle approaching'},
      {mediaIndex:1,sourceIndex:1,mediaId:'smoke-1',start:3,end:7,duration:4,description:'motorcycle cornering'},
      {mediaIndex:2,sourceIndex:2,mediaId:'smoke-2',start:7,end:11,duration:4,description:'motorcycle hero reveal'}
    ]
  };
  const smokePlan=createAIEditPlan(smokeAnalysis,{creativePrompt:'cinematic motorcycle action reveal',targetDuration:11,maxCuts:6});
  assert(smokePlan&&Array.isArray(smokePlan.cuts)&&smokePlan.cuts.length>=3,'media-intelligence runtime guard failed: smoke edit plan did not produce usable cuts');
  assert(Number.isFinite(Number(smokePlan.qualityScore)),'media-intelligence runtime guard failed: smoke edit plan has no finite quality score');
}

if(/buildDirectorStory/.test(planner)||/storyBeats/.test(planner)){
  assert(/import\s*\{\s*buildDirectorStory\s*\}\s*from ['"]\.\/director\.js['"]/.test(planner),'production-path guard failed: aiEditPlanner.js does not import the canonical director story planner');
  assert(/const\s+storyBeats\s*=\s*buildDirectorStory\(/.test(planner),'production-path guard failed: aiEditPlanner.js does not construct story beats in the planner path');
  assert(/storyBeats\.map\(/.test(planner),'production-path guard failed: story beats are not consumed to construct auditable edit-plan evidence');
  const storyFallbackIndex=planner.indexOf('}else if(storyBeats.length){');
  const selectedFallbackIndex=planner.indexOf('}else if(selectedMoments.length){');
  assert(storyFallbackIndex>=0&&selectedFallbackIndex>=0&&storyFallbackIndex<selectedFallbackIndex,'production-path guard failed: story beats are not the first deterministic planner fallback');
}

if(/export function scoreDirectorContinuity\s*\(/.test(director)){
  const srcFiles=execFileSync('git',['ls-files','src'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  const references=srcFiles.reduce((count,path)=>count+(read(path).match(/scoreDirectorContinuity\s*\(/g)||[]).length,0);
  assert(references>=2,'dead-intelligence guard failed: scoreDirectorContinuity is exported but not consumed by production code');
}
for(const helper of ['filterCaptionCues','normaliseCaptionTiming']){
  if(!changed.includes('src/captionPlanner.js'))continue;
  const srcFiles=execFileSync('git',['ls-files','src'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  const references=srcFiles.reduce((count,path)=>count+(read(path).match(new RegExp(`${helper}\\s*\\(`,'g'))||[]).length,0);
  assert(references>=2,`dead-intelligence guard failed: ${helper} is exported but not consumed by production code`);
}
console.log(`autobot-product-change-quality: PASS cinematic guard; changed=${cinematicChanged.join(',')}; storyBeats=${storyLength??'not-applicable'}; production-path=${storyIntegrationRequested?'verified':'unchanged'}; diff-source=${process.env.AUTOBOT_PRODUCT_QUALITY_BASE_COMMIT?'committed-candidate':'working-tree'}`);
