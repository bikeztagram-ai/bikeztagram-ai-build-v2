import {buildRendererContract} from './renderContractV2.js';
import {buildLongFormAudioPlan} from './longFormAudioPlanV2.js';
import {buildMusicGenerationRequest} from './musicGenerationRouterV2.js';
export function buildCinematicProductionV2({cuts=[],duration=15,composition={},music={}}={}){
 const audioPlan=buildLongFormAudioPlan({composition,duration});
 const render=buildRendererContract({cuts,duration,music:{...music,duration,sections:audioPlan.sections}});
 const musicRequest=buildMusicGenerationRequest({...composition,duration});
 return {version:'cinematic-production-v2',duration,render,audio:audioPlan,musicRequest,contracts:{continuous:render.continuous,beatAware:render.audio.beatMap.length>0,longForm:true,providerReady:true}};
}
