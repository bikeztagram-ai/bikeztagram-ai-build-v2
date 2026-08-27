/* Creative Director V2 — turns one request + assets into an executable film plan. */
import { buildCreativeBrief, buildGenerationRequest } from './creativeEngineContract.js';
import { inferMusicDirection, buildMusicBrief } from './musicDirectorV2.js';
import { buildSubjectManifest } from './subjectManifestV2.js';
import { analyseMediaLibrary } from './mediaUnderstandingV2.js';
import { buildScenePlan } from './videoGenerationV2.js';
import { buildCinematicTreatments } from './cinematicTreatment.js';
const t=v=>String(v??'').trim();
function has(p,...words){return words.some(w=>p.includes(w));}

export function directCreativeRequest({prompt='',assets=[],duration=15,aspectRatio='9:16'}={}){
 const p=t(prompt), lower=p.toLowerCase(), media=analyseMediaLibrary(assets), subjects=buildSubjectManifest(assets), music=buildMusicBrief({prompt:p,duration}),
   brief=buildCreativeBrief({prompt:p,duration,aspectRatio,assets});
 brief.story={hook:'immediate visual hook',build:'increase anticipation',reveal:'deliver the primary subject/payoff',escalation:'increase motion and intensity',climax:'strongest musical and visual moment',outro:'clean hero ending'};
 brief.visual={style:has(lower,'cinematic','trailer')?'cinematic trailer':'cinematic social',camera:has(lower,'handheld')?'handheld':has(lower,'drone')?'drone':'dynamic controlled camera',lighting:has(lower,'dark','moody')?'dark/moody':'cinematic',environment:has(lower,'city','urban')?'urban':has(lower,'road','mountain')?'road/outdoor':'environment inferred from assets',motion:has(lower,'slow')?'controlled slow motion':'dynamic motion',palette:has(lower,'blue')?'cool blue':'moody cinematic'};
 brief.music={request:music.creativeRequest,genre:music.genre,bpm:music.bpm,mood:music.mood,energy:music.energy,sections:music.sections,events:music.events};
 const scenePlan=buildScenePlan({brief,media:media.items,musicEvents:music.events,subjectManifest:subjects});
 const cinematicTreatments=buildCinematicTreatments({moments:scenePlan.slots,creativePrompt:p,targetDuration:duration});
 const treatedSlots=scenePlan.slots.map((slot,index)=>({...slot,...(cinematicTreatments.items[index]?.cinematicTreatment?{cinematicTreatment:cinematicTreatments.items[index].cinematicTreatment,treatmentDuration:cinematicTreatments.items[index].treatmentDuration}: {})}));
 const executableScenePlan={...scenePlan,slots:treatedSlots,treatmentVersion:cinematicTreatments.version};
 const generationRequests=[];
 for(const slot of treatedSlots){
   if(slot.generation==='preferred') generationRequests.push(buildGenerationRequest({type:'insert',prompt:`${p}. Generate an original cinematic ${slot.role} that bridges real footage and lands precisely on the music event. Treatment: ${slot.cinematicTreatment?.motion||'subtle motion'}, ${slot.cinematicTreatment?.composition||'natural framing'}, ${slot.cinematicTreatment?.transition||'clean cut'}.`,duration:slot.duration,assets,subjectIds:subjects.subjects.map(s=>s.id),timelineSlot:{start:slot.start,role:slot.role},direction:{...brief.visual,motion:slot.cinematicTreatment?.motion||brief.visual.motion}}));
 }
 return {version:'creative-direction-v2',brief,media,subjectManifest:subjects,music,scenePlan:executableScenePlan,cinematicTreatments,generationRequests,decisionLog:[`Parsed natural-language intent: ${p||'cinematic film'}`,`Real media first: ${media.count} assets analysed`,`Music: ${music.genre} at ${music.bpm} BPM`,`Generated scene slots: ${generationRequests.length}`,`Cinematic treatments: ${cinematicTreatments.items.length} slots directed with deterministic motion/composition cues`]};
}

export function buildCreativeCommandPlan(input={}){const plan=directCreativeRequest(input);return{version:'creative-command-plan-v2',input:{prompt:t(input.prompt),duration:Number(input.duration)||15,aspectRatio:input.aspectRatio||'9:16'},stages:[
 {id:'understand',status:'planned',output:'media + subject analysis'},
 {id:'direct',status:'planned',output:'story + visual + music brief'},
 {id:'music',status:'planned',output:'original soundtrack candidates'},
 {id:'scenes',status:'planned',output:'generated inserts where useful'},
 {id:'assemble',status:'planned',output:'beat-aware timeline'},
 {id:'render',status:'planned',output:'finished film'},
 {id:'qa',status:'planned',output:'creative + technical scores'},
 {id:'revise',status:'planned',output:'bounded automatic improvement'},
 {id:'export',status:'planned',output:'social-ready outputs'}],plan};}
