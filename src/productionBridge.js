/* Production bridge: uploaded/Gemini media plans -> music-aware cinematic production -> renderer. */
import { buildCinematicProduction } from './cinematicPipeline.js';
import { adaptCinematicPlanForRenderer } from './cinematicRendererAdapter.js';
import { buildCinematicDecisionPipeline } from './cinematicDecisionPipeline.js';
export function buildProductionBridge({mediaItems=[],editPlan={},prompt='',duration=15,bpm=112,energy=.72,mood='cinematic',genre,filmType='trailer',useGeneratedScenes=false,allowGeneratedInserts=false,hasSourceAudio=true}={}){
 const rawCuts=(editPlan.cuts||[]).map((c,i)=>({...c,mediaIndex:Number.isInteger(Number(c.mediaIndex??c.sourceIndex))?Number(c.mediaIndex??c.sourceIndex):i,duration:Number(c.duration)||2,purpose:c.purpose||c.role||'bridge'}));
 const decisions=buildCinematicDecisionPipeline({cuts:rawCuts,mediaItems,prompt,duration:Number(editPlan.targetDuration||duration)||duration,genre,mood,energy,bpm,useGeneratedScenes,allowGeneratedInserts,filmType});
 const production=buildCinematicProduction({cuts:decisions.cuts,duration:Number(editPlan.targetDuration||duration)||duration,bpm:decisions.music.brief.bpm,energy:decisions.music.brief.energy,mood:decisions.music.brief.mood,hasSourceAudio,prompt});
 production.music={...production.music,composition:decisions.music.composition};
 production.cuts=production.cuts.map((cut,i)=>({...cut,mediaIndex:decisions.cuts[i]?.mediaIndex??cut.mediaIndex,transition:decisions.cuts[i]?.transition??cut.transition}));
 const renderPlan=adaptCinematicPlanForRenderer(production);
 return {version:'production-bridge-v2',mediaItems,sourceCount:mediaItems.length,decisions,production,renderPlan,ready:Boolean(renderPlan.renderContract?.continuous&&renderPlan.qa?.pass),preservesUploadedMedia:true};
}
