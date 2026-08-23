import {buildMusicBrief,alignCutsToMusic} from './musicDirectorV2.js';
import {buildMusicGenerationPlan} from './musicCompositionV3.js';
import {applyDirectedTransitions} from './transitionDirectorV2.js';
import {resolveSceneSourcePolicy,filterGeneratedInserts} from './realFootagePolicy.js';
export function buildCinematicDecisionPipeline({cuts=[],mediaItems=[],prompt='',duration=15,genre,mood,energy,bpm,useGeneratedScenes=false,allowGeneratedInserts=false,filmType='trailer'}={}){
 const brief=buildMusicBrief({prompt,duration,genre,mood,energy,bpm});
 const musicPlan=buildMusicGenerationPlan({prompt,duration,genre:brief.genre,mood:brief.mood,energy:brief.energy,filmType});
 const aligned=alignCutsToMusic(cuts,brief);
 const directed=applyDirectedTransitions(aligned,brief);
 const policy=resolveSceneSourcePolicy({useGeneratedScenes,allowGeneratedInserts,mediaItems});
 const sceneSafe=filterGeneratedInserts(directed,policy);
 return {version:'cinematic-decision-v1',music:{brief,composition:musicPlan},cuts:sceneSafe,scenePolicy:policy,contracts:{musicDrivesEdit:true,realFootageFirst:policy.primarySource==='uploaded-media',continuousTimeline:true,generatedInsertsExplicit:policy.generatedScenesEnabled}};
}
