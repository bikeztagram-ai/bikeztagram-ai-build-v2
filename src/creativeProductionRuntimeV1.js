import { buildCinematicDecisionPipeline } from './cinematicDecisionPipeline.js';
import { planGeneratedScenePlacement } from './generatedScenePlacementV1.js';
export function buildCreativeProductionRuntime({mediaItems=[],prompt='',duration=15,cuts=[],musicEvents=[],subjectIds=[],generatedScenes=[]}={}){
 const decision=buildCinematicDecisionPipeline({mediaItems,prompt,duration,cuts,allowGeneratedInserts:generatedScenes.length>0,useGeneratedScenes:generatedScenes.length>0});
 const placement=planGeneratedScenePlacement({scenes:generatedScenes,musicEvents,media:mediaItems,subjectIds});
 return {version:'creative-production-runtime-v1',input:{mediaCount:mediaItems.length,duration,prompt},decision,generatedPlacement:placement,stages:['media-intake','creative-direction','music-direction','scene-placement','continuity','transition-direction','render','qa'],status:'planned',contracts:{realFootageFirst:decision.contracts.realFootageFirst,musicDrivesEdit:decision.contracts.musicDrivesEdit,generatedContinuityRequired:true,qaBeforeExport:true}};
}
export function validateCreativeProductionRuntime(runtime={}){const c=runtime.contracts||{};const required=['realFootageFirst','musicDrivesEdit','generatedContinuityRequired','qaBeforeExport'];const missing=required.filter(k=>c[k]!==true);return missing.length?{ok:false,reason:`missing-contract:${missing[0]}`}:{ok:true};}
