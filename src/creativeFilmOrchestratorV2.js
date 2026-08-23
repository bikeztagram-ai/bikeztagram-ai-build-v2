/*
 * Creative Film Orchestrator V2 — one job, one film, parallelizable stages.
 * The orchestrator owns decisions; providers only execute them.
 */
import { directCreativeRequest } from './creativeDirectorV2.js';
import { buildCreativeJob } from './creativeEngineContract.js';
import { buildSceneGenerationSet, scoreGeneratedScene } from './sceneGenerationV2.js';
import { alignCutsToMusic } from './musicDirectorV2.js';
import { validateSubjectContinuity } from './subjectManifestV2.js';

const text=v=>String(v??'').trim();

export function planCompleteFilm(input={}){
  const direction=directCreativeRequest(input);
  const generatedScenes=buildSceneGenerationSet({prompt:input.prompt||'',duration:direction.brief.duration,aspectRatio:direction.brief.aspectRatio,subjectIds:direction.subjectManifest.subjects.map(s=>s.id),referenceAssets:direction.media.items.map(i=>i.id||i.sourceId).filter(Boolean),visual:direction.brief.visual,musicEvents:direction.music.events});
  const generationRequests=generatedScenes.map(scene=>({...scene,type:scene.role==='reveal'?'subject-scene':scene.role==='opening'?'establishing-shot':'insert',status:'queued'}));
  const scores=generationRequests.map(scene=>scoreGeneratedScene(scene,{prompt:input.prompt,role:scene.role}));
  const cuts=alignCutsToMusic(direction.scenePlan?.slots||[],direction.music);
  const continuity=generationRequests.map(scene=>({sceneId:scene.id,...validateSubjectContinuity(direction.subjectManifest,scene)}));
  const job=buildCreativeJob(direction.brief,{media:direction.media.items,generationRequests});
  return {version:'complete-film-plan-v2',job:{...job,id:`film-${Date.now()}-${Math.random().toString(36).slice(2,8)}`},direction,generatedScenes:generationRequests,generatedSceneScores:scores,music:direction.music,beatAlignedSlots:cuts,continuity,execution:{parallelGroups:[{id:'understand',tasks:['media-analysis','subject-manifest']},{id:'creative',tasks:['creative-direction','music-direction','scene-blueprints']},{id:'generation',tasks:['original-music','generated-scenes'],parallel:true},{id:'assembly',tasks:['timeline','render']},{id:'quality',tasks:['audio-QA','visual-QA','continuity-QA']}],deployment:'manual-only'},decisionLog:[...direction.decisionLog,`Generated scene blueprints: ${generationRequests.length}`,`Generation jobs parallelisable: ${generationRequests.length+1}`,`Subject continuity checks: ${continuity.length}`]};
}

export async function executeGenerationBatch(plan,{musicGenerator,sceneGenerator}={}){
  const jobs=[];
  if(typeof musicGenerator==='function') jobs.push(Promise.resolve().then(()=>musicGenerator(plan.music)).then(result=>({kind:'music',result})).catch(error=>({kind:'music',error}))); 
  if(typeof sceneGenerator==='function') for(const scene of plan.generatedScenes||[]) jobs.push(Promise.resolve().then(()=>sceneGenerator(scene)).then(result=>({kind:'scene',sceneId:scene.id,result})).catch(error=>({kind:'scene',sceneId:scene.id,error})));
  const results=await Promise.all(jobs);
  const successful=results.filter(r=>!r.error).length;
  const required=jobs.length;
  return {version:'generation-batch-result-v2',results,success:required>0&&successful===required,completed:successful,total:required,failed:results.length-successful,parallel:true};
}

export function buildCreativeDirectorSummary(plan){return {title:plan?.direction?.brief?.prompt||'Bikeztagram AI film',duration:plan?.direction?.brief?.duration||15,aspectRatio:plan?.direction?.brief?.aspectRatio||'9:16',music:`${plan?.music?.genre||'cinematic'} @ ${plan?.music?.bpm||120} BPM`,generatedScenes:(plan?.generatedScenes||[]).map(s=>`${s.role}: ${s.direction?.environment||'environment'}`),readyForProviderExecution:(plan?.generatedSceneScores||[]).every(s=>s.ready)&&(plan?.continuity||[]).every(c=>c.valid!==false)}};
