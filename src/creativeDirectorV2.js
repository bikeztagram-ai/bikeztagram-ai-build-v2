/* Creative Director V2 — turns one request + assets into an executable film plan. */
import { buildCreativeBrief, buildGenerationRequest } from './creativeEngineContract.js';
import { inferMusicDirection, buildMusicBrief } from './musicDirectorV2.js';
import { buildSubjectManifest } from './subjectManifestV2.js';
import { analyseMediaLibrary } from './mediaUnderstandingV2.js';
import { buildScenePlan } from './videoGenerationV2.js';
import { planCreativeStory, validateCreativeStoryPlan } from './creative/creativeStoryPlanner.js';
const t=v=>String(v??'').trim();
function has(p,...words){return words.some(w=>p.includes(w));}

export function directCreativeRequest({prompt='',assets=[],duration=15,aspectRatio='9:16'}={}){
 const p=t(prompt), lower=p.toLowerCase(), media=analyseMediaLibrary(assets), subjects=buildSubjectManifest(assets), music=buildMusicBrief({prompt:p,duration}),
   brief=buildCreativeBrief({prompt:p,duration,aspectRatio,assets});
 brief.story={hook:'immediate visual hook',build:'increase anticipation',reveal:'deliver the primary subject/payoff',escalation:'increase motion and intensity',climax:'strongest musical and visual moment',outro:'clean hero ending'};
 brief.visual={style:has(lower,'cinematic','trailer')?'cinematic trailer':'cinematic social',camera:has(lower,'handheld')?'handheld':has(lower,'drone')?'drone':'dynamic controlled camera',lighting:has(lower,'dark','moody')?'dark/moody':'cinematic',environment:has(lower,'city','urban')?'urban':has(lower,'road','mountain')?'road/outdoor':'environment inferred from assets',motion:has(lower,'slow')?'controlled slow motion':'dynamic motion',palette:has(lower,'blue')?'cool blue':'moody cinematic'};
 brief.music={request:music.creativeRequest,genre:music.genre,bpm:music.bpm,mood:music.mood,energy:music.energy,sections:music.sections,events:music.events};
 const storyPlan=planCreativeStory({brief,media:media.items,primarySubject:subjects.subjects?.[0]?.type||media.primarySubjectType||'unknown'});
 const storyValidation=validateCreativeStoryPlan(storyPlan);
 if(!storyValidation.valid)throw new Error(`Creative story plan validation failed: ${storyValidation.errors.join('; ')}`);
 const baseScenePlan=buildScenePlan({brief,media:media.items,musicEvents:music.events,subjectManifest:subjects});
 const storySlots=[];
 let cursor=0;
 for(const moment of storyPlan.moments){
   storySlots.push({
     id:moment.id,
     role:moment.role,
     phase:moment.phase,
     start:Number(cursor.toFixed(2)),
     duration:moment.durationSeconds,
     generation:moment.generation.preferred?'preferred':moment.generation.allowed?'optional':'source-first',
     selectedMediaIds:moment.selectedMediaIds,
     candidateMediaIds:moment.candidateMediaIds,
     purpose:moment.purpose,
     requirements:moment.requirements,
     editorialNotes:moment.editorialNotes,
   });
   cursor+=moment.durationSeconds;
 }
 const scenePlan={
   ...baseScenePlan,
   version:'scene-plan-v3',
   storyPlan,
   slots:storySlots,
   strategy:storyPlan.strategy,
 };
 const generationRequests=[];
 for(const slot of scenePlan.slots){
   if(slot.generation!=='preferred')continue;
   generationRequests.push(buildGenerationRequest({
     type:'insert',
     prompt:[
       p||'Create an original cinematic film.',
       `Story role: ${slot.role}.`,
       `Purpose: ${slot.purpose}`,
       `Requirements: ${slot.requirements.join(', ')}.`,
       'Generate original material only; preserve subject identity and world continuity when references are supplied.',
     ].join(' '),
     duration:slot.duration,
     assets,
     subjectIds:subjects.subjects.map(s=>s.id),
     timelineSlot:{start:slot.start,role:slot.role,phase:slot.phase},
     direction:brief.visual,
   }));
 }
 return {version:'creative-direction-v2',brief,media,subjectManifest:subjects,music,storyPlan,scenePlan,generationRequests,decisionLog:[
   `Parsed natural-language intent: ${p||'cinematic film'}`,
   `Real media first: ${media.count} assets analysed`,
   `Narrative arc: ${storyPlan.moments.map(moment=>moment.phase).join(' → ')}`,
   `Music: ${music.genre} at ${music.bpm} BPM`,
   `Generated story slots: ${generationRequests.length}`,
 ]};
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
