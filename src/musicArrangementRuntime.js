/* BIKEZTAGRAM AI — browser-local editable music arrangement runtime. */
import { composeFullMusic, renderMusicWav } from './musicStudioEngine.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const clone=value=>JSON.parse(JSON.stringify(value));

export function createArrangementProject(options={}){
  const brief={...(options.brief||{})};
  const composition=options.composition||composeFullMusic(brief);
  return {
    version:1,
    id:options.id||`song-${Date.now().toString(36)}`,
    title:String(options.title||brief.title||'Bikeztagram Original'),
    brief,
    composition:clone(composition),
    sectionEdits:[],
    mutedStems:[],
    master:{gainDb:0,limiterDb:-1,stereoWidth:1,lowCutHz:28},
    updatedAt:new Date().toISOString()
  };
}

export function updateArrangementSection(project,sectionIndex,patch={}){
  const next=clone(project);
  const sections=next.composition?.sections||[];
  if(!sections[sectionIndex])throw new Error(`Unknown music section ${sectionIndex}.`);
  const allowed=['name','startBeat','durationBeats','energy','density','swing','reverb','filter','octave'];
  for(const key of allowed){if(patch[key]!==undefined)sections[sectionIndex][key]=patch[key];}
  next.sectionEdits=[...(next.sectionEdits||[]),{sectionIndex,patch:clone(patch),at:new Date().toISOString()}];
  next.updatedAt=new Date().toISOString();
  return next;
}

export function toggleArrangementStem(project,stem){
  const next=clone(project);
  const name=String(stem||'').toLowerCase();
  if(!['drums','bass','harmony','melody','fx'].includes(name))throw new Error(`Unsupported stem: ${stem}.`);
  const muted=new Set(next.mutedStems||[]);
  muted.has(name)?muted.delete(name):muted.add(name);
  next.mutedStems=[...muted];
  next.updatedAt=new Date().toISOString();
  return next;
}

export function updateMastering(project,patch={}){
  const next=clone(project);
  next.master={...next.master};
  if(patch.gainDb!==undefined)next.master.gainDb=clamp(Number(patch.gainDb)||0,-12,6);
  if(patch.limiterDb!==undefined)next.master.limiterDb=clamp(Number(patch.limiterDb)||-1,-6,0);
  if(patch.stereoWidth!==undefined)next.master.stereoWidth=clamp(Number(patch.stereoWidth)||1,.5,1.5);
  if(patch.lowCutHz!==undefined)next.master.lowCutHz=clamp(Number(patch.lowCutHz)||28,20,120);
  next.updatedAt=new Date().toISOString();
  return next;
}

function applyMaster(buffer,master={}){
  const gain=Math.pow(10,(Number(master.gainDb)||0)/20);
  const limiter=Math.pow(10,(Number(master.limiterDb)??-1)/20);
  for(let i=0;i<buffer.length;i++)buffer[i]=clamp(buffer[i]*gain,-limiter,limiter);
  return buffer;
}

export async function renderArrangementWav(project,options={}){
  const composition=clone(project?.composition||composeFullMusic(project?.brief||{}));
  const muted=new Set(project?.mutedStems||[]);
  if(muted.size)composition.mutedStems=[...muted];
  const wav=await renderMusicWav(composition,{duration:Number(options.duration)||composition.duration||30,includeStems:true});
  return {...wav,mastering:project?.master||{},audioDataUrl:wav.audioDataUrl};
}

export function analyseArrangement(project){
  const c=project?.composition||{};
  const sections=Array.isArray(c.sections)?c.sections:[];
  const events=Array.isArray(c.events)?c.events:[];
  const muted=new Set(project?.mutedStems||[]);
  const activeStemCount=5-muted.size;
  const energy=sections.length?sections.reduce((s,x)=>s+Number(x.energy||0),0)/sections.length:0;
  return {
    ok:Boolean(c.beatGrid?.length&&events.length&&sections.length),
    bpm:Number(c.bpm)||120,
    key:c.key||'C',
    mode:c.mode||'minor',
    sections:sections.length,
    events:events.length,
    activeStemCount,
    averageEnergy:Number(energy.toFixed(3)),
    mutedStems:[...muted],
    editCount:Array.isArray(project?.sectionEdits)?project.sectionEdits.length:0,
    mastering:project?.master||{}
  };
}
