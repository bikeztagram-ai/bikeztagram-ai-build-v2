/* Creative Director V2 — turns one request + assets into an executable film plan. */
import { buildCreativeBrief, buildGenerationRequest } from './creativeEngineContract.js';
import { buildMusicBrief } from './musicDirectorV2.js';
import { buildSubjectManifest } from './subjectManifestV2.js';
import { analyseMediaLibrary } from './mediaUnderstandingV2.js';
import { buildScenePlan } from './videoGenerationV2.js';
import { buildSceneGenerationSet } from './sceneGenerationV2.js';
const t=v=>String(v??'').trim();
function has(p,...words){return words.some(w=>p.includes(w));}

export function directCreativeRequest({prompt='',assets=[],duration=15,aspectRatio='9:16'}={}){
 const p=t(prompt), lower=p.toLowerCase(), media=analyseMediaLibrary(assets), subjects=buildSubjectManifest(assets), music=buildMusicBrief({prompt:p,duration}),
   brief=buildCreativeBrief({prompt:p,duration,aspectRatio,assets});
 brief.story={hook:'immediate visual hook',build:'increase anticipation',reveal:'deliver the primary subject/payoff',escalation:'increase motion and intensity',climax:'strongest musical and visual moment',outro:'clean hero ending'};
 brief.visual={style:has(lower,'cinematic','trailer')?'cinematic trailer':'cinematic social',camera:has(lower,'handheld')?'handheld':has(lower,'drone')?'drone':'dynamic controlled camera',lighting:has(lower,'dark','moody')?'dark/moody':'cinematic',environment:has(lower,'city','urban')?'urban':has(lower,'road','mountain')?'road/outdoor':'environment inferred from assets',motion:has(lower,'slow')?'controlled slow motion':'dynamic motion',palette:has(lower,'blue')?'cool blue':'moody cinematic'};
 brief.music={request:music.creativeRequest,genre:music.genre,bpm:music.bpm,mood:music.mood,energy:music.energy,sections:music.sections,events:music.events};
 const scenePlan=buildScenePlan({brief,media:media.items,musicEvents:music.events,subjectManifest:subjects});
 const subjectIds=subjects.subjects.map(s=>s.id);
 const referenceAssets=media.items.map(item=>item.id||item.sourceId).filter(Boolean);
 const sceneBlueprints=buildSceneGenerationSet({prompt:p,duration:brief.duration,aspectRatio:brief.aspectRatio,subjectIds,referenceAssets,visual:brief.visual,musicEvents:music.events});
 const generationRequests=[];
 for(const scene of sceneBlueprints){generationRequests.push({...buildGenerationRequest({type:scene.role==='reveal'?'subject-scene':scene.role==='opening'?'establishing-shot':'insert',prompt:scene.prompt,duration:scene.duration,assets,subjectIds,timelineSlot:{role:scene.role},direction:scene.direction}),sceneBlueprint:scene});}
 for(const slot of scenePlan.slots){
   if(slot.generation==='preferred') generationRequests.push(buildGenerationRequest({type:'insert',prompt:`${p}. Generate an original cinematic ${slot.role} that bridges real footage and lands precisely on the music event.`,duration:slot.duration,assets,subjectIds,timelineSlot:{start:slot.start,role:slot.role},direction:brief.visual}));
 }
 return {version:'creative-direction-v3',brief,media,subjectManifest:subjects,music,scenePlan,sceneBlueprints,generationRequests,decisionLog:[`Parsed natural-language intent: ${p||'cinematic film'}`,`Real media first: ${media.count} assets analysed`,`Music: ${music.genre} at ${music.bpm} BPM`,`Generated scene blueprints: ${sceneBlueprints.length}`,`Total generation requests: ${generationRequests.length}`]};
}

export function buildCreativeCommandPlan(input={}){const plan=directCreativeRequest(input);return{version:'creative-command-plan-v3',input:{prompt:t(input.prompt),duration:Number(input.duration)||15,aspectRatio:input.aspectRatio||'9:16'},stages:[
 {id:'understand',status:'planned',output:'media + subject analysis'},
 {id:'direct',status:'planned',output:'story + visual + music brief'},
 {id:'music',status:'planned',output:'original soundtrack candidates',parallel:true},
 {id:'scenes',status:'planned',output:'generated scene blueprints + provider jobs',parallel:true},
 {id:'assemble',status:'planned',output:'beat-aware timeline'},
 {id:'render',status:'planned',output:'finished film'},
 {id:'qa',status:'planned',output:'creative + technical scores'},
 {id:'revise',status:'planned',output:'bounded automatic improvement'},
 {id:'export',status:'planned',output:'social-ready outputs'}],parallelGeneration:true,plan};}
