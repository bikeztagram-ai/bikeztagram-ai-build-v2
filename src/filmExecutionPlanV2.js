import {resolveFilmDuration,buildDurationPolicy} from './filmDurationPolicyV2.js';
import {buildCinematicDecisionPipeline} from './cinematicDecisionPipeline.js';
import {buildRendererContract} from './renderContractV2.js';
export function buildFilmExecutionPlan({mediaItems=[],cuts=[],prompt='',requestedDuration,genre,mood,energy=.72,bpm=112,filmType='trailer',useGeneratedScenes=false,allowGeneratedInserts=false}={}){
 const duration=resolveFilmDuration({requestedDuration,prompt,mediaCount:mediaItems.length});
 const policy=buildDurationPolicy({duration});
 const decisions=buildCinematicDecisionPipeline({cuts,mediaItems,prompt,duration,genre,mood,energy,bpm,filmType,useGeneratedScenes,allowGeneratedInserts});
 const render=buildRendererContract({cuts:decisions.cuts,duration,music:{duration,beatGrid:decisions.music?.brief?.beatGrid,sections:decisions.music?.composition?.sections}});
 return {version:'film-execution-v2',duration,policy,decisions,render,ready:Boolean(render.continuous&&render.qa.noBlackGaps),execution:{realFootageFirst:decisions.contracts.realFootageFirst,musicDrivesEdit:decisions.contracts.musicDrivesEdit,generatedScenesOptIn:Boolean(decisions.scenePolicy.generatedScenesEnabled),continuousTimeline:render.continuous}};
}
