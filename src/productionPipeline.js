/* Parallel production orchestrator — one deterministic job contract for the whole creative pipeline. */
import { buildCreativeJob } from './creativeEngineContract.js';
import { directCreativeRequest } from './creativeDirectorV2.js';
import { buildCompleteAudioSystem } from './audioSystem.js';
import { generateOriginalMusic } from './musicGenerator.js';
import { createProjectSnapshot, saveProject } from './projectPersistence.js';

const now=()=>new Date().toISOString();
const safeArray=v=>Array.isArray(v)?v:[];

export function createProductionJob(input={}){
  const direction=directCreativeRequest(input);
  const audio=buildCompleteAudioSystem({creativePrompt:input.prompt,duration:direction.brief.duration,cuts:direction.scenePlan?.cuts||[],musicEnabled:input.musicEnabled!==false,hasVoiceover:Boolean(input.hasVoiceover),hasSfx:input.hasSfx!==false});
  const job=buildCreativeJob(direction.brief,{media:direction.media?.items||[],generationRequests:direction.generationRequests||[]});
  return {...job,status:'ready',createdAt:now(),direction,audio,progress:{stage:'understand',completed:0,total:job.stages.length},artifacts:{soundtrack:null,timeline:null,render:null,qa:null,export:null},errors:[]};
}

export async function runProductionJob(input={},hooks={}){
  const job=createProductionJob(input);
  const emit=typeof hooks.onStage==='function'?hooks.onStage:()=>{};
  const set=(stage,index,extra={})=>{job.status=stage;job.progress={stage,completed:index,total:job.stages.length};emit({...job.progress,jobId:job.id,...extra});};
  try{
    set('understand',1); set('direct',2);
    set('music',3);
    if(input.musicEnabled!==false){
      const music=await generateOriginalMusic({prompt:job.direction.brief.prompt,duration:job.direction.brief.duration,genre:job.direction.music.genre,mood:job.direction.music.mood,energy:job.direction.music.energy,bpm:job.direction.music.bpm});
      job.artifacts.soundtrack=music.soundtrack||null;
      if(music.soundtrack?.audioAvailable) job.audio.render.audioDataUrl=music.soundtrack.audioDataUrl;
    }
    set('scenes',4,{generationRequests:job.generationRequests.length});
    job.artifacts.timeline={scenePlan:job.direction.scenePlan,audioTimeline:job.audio.timeline};
    set('assemble',5);
    set('render',6,{renderReady:Boolean(job.audio.render.audioDataUrl||input.musicEnabled===false)});
    set('qa',7);
    job.artifacts.qa=buildProductionQa(job);
    set('revise',8);
    if(job.artifacts.qa.score<70 && input.autoRevise!==false){job.direction=directCreativeRequest({...input,prompt:`${input.prompt||''} Improve weak areas: ${job.artifacts.qa.reasons.join('; ')}`});job.revision.attempts=1;job.artifacts.timeline={scenePlan:job.direction.scenePlan,audioTimeline:job.audio.timeline};job.artifacts.qa=buildProductionQa(job);}
    set('export',9);
    job.artifacts.export={ready:job.artifacts.qa.score>=60,aspectRatio:job.direction.brief.aspectRatio,duration:job.direction.brief.duration,format:'mp4',delivery:'browser-local'};
    job.status='complete';
    return job;
  }catch(error){job.status='failed';job.errors.push(error?.message||String(error));emit({jobId:job.id,stage:'failed',error:job.errors.at(-1)});return job;}
}

export function buildProductionQa(job={}){
  const plan=job.direction?.scenePlan||{}, media=safeArray(job.direction?.media?.items), gens=safeArray(job.generationRequests), audio=job.artifacts?.soundtrack;
  const checks=[
    ['has-media',media.length>0,'No media supplied.'],
    ['has-scenes',safeArray(plan.slots).length>0,'No scene plan was produced.'],
    ['has-variety',new Set(safeArray(plan.slots).map(s=>s.role)).size>=Math.min(3,safeArray(plan.slots).length),'Scene variety is weak.'],
    ['has-audio',Boolean(audio?.audioAvailable)||job.audio?.render?.audioDataUrl,'No audible soundtrack is available.'],
    ['copyright-safe',job.direction?.brief?.constraints?.copyrightSafety===true,'Copyright safety contract is missing.'],
    ['identity-safe',job.direction?.brief?.constraints?.preserveIdentity===true,'Identity preservation contract is missing.'],
    ['generation-bounded',gens.length<=8,'Too many generated inserts requested.']
  ];
  const passed=checks.filter(c=>c[1]).length;
  return {version:'production-qa-v1',score:Math.round(passed/checks.length*100),passed,checks:checks.map(c=>({id:c[0],ok:c[1],message:c[2]})),reasons:checks.filter(c=>!c[1]).map(c=>c[2]),ready:passed>=Math.ceil(checks.length*.7)};
}

export function persistProductionJob(job,{sources=[],editorState={}}={}){
  const snapshot=createProjectSnapshot({prompt:job.direction?.brief?.prompt,sources,analysis:job.direction?.media,plan:job.direction,productionPlan:job, soundtrack:job.artifacts?.soundtrack,exportInfo:job.artifacts?.export,editorState});
  return saveProject(snapshot);
}
