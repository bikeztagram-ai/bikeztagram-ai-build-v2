import {buildMusicBrief,alignCutsToMusic} from './musicDirectorV2.js';
import {buildMusicGenerationPlan} from './musicCompositionV3.js';
import {applyDirectedTransitions} from './transitionDirectorV2.js';
import {resolveSceneSourcePolicy,filterGeneratedInserts} from './realFootagePolicy.js';
import {planGeneratedScenePlacement} from './generatedScenePlacementV1.js';
export function buildCinematicDecisionPipeline({cuts=[],mediaItems=[],prompt='',duration=15,genre,mood,energy,bpm,useGeneratedScenes=false,allowGeneratedInserts=false,filmType='trailer',subjectIds=[],generatedSceneBlueprints=[]}={}){
 const brief=buildMusicBrief({prompt,duration,genre,mood,energy,bpm});
 const musicPlan=buildMusicGenerationPlan({prompt,duration,genre:brief.genre,mood:brief.mood,energy:brief.energy,filmType});
 const aligned=alignCutsToMusic(cuts,brief);
 const directed=applyDirectedTransitions(aligned,brief);
 const policy=resolveSceneSourcePolicy({useGeneratedScenes,allowGeneratedInserts,mediaItems});
 const sceneSafe=filterGeneratedInserts(directed,policy);
 const generatedPlacement=planGeneratedScenePlacement({scenes:generatedSceneBlueprints,musicEvents:brief.events||[],media:mediaItems,subjectIds});
 return {version:'cinematic-decision-v2',music:{brief,composition:musicPlan},cuts:sceneSafe,generatedPlacement,scenePolicy:policy,contracts:{musicDrivesEdit:true,realFootageFirst:policy.primarySource==='uploaded-media',continuousTimeline:true,generatedInsertsExplicit:policy.generatedScenesEnabled,generatedPlacementContinuity:true}};
}
