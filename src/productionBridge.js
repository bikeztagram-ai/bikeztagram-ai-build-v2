/* Batch 93-96: provider-neutral bridge from uploaded/Gemini media plans into cinematic orchestration. */
import { buildCinematicProduction } from './cinematicPipeline.js';
import { adaptCinematicPlanForRenderer } from './cinematicRendererAdapter.js';

export function buildProductionBridge({mediaItems=[],editPlan={},prompt='',duration=15,bpm=112,energy=.72,mood='cinematic',hasSourceAudio=true}={}){
 const cuts=(editPlan.cuts||[]).map((c,i)=>({
  ...c,
  mediaIndex:Number.isInteger(Number(c.mediaIndex??c.sourceIndex))?Number(c.mediaIndex??c.sourceIndex):i,
  duration:Number(c.duration)||2,
  purpose:c.purpose||c.role||'bridge',
  transition:c.transitionIn||c.transition||undefined
 }));
 const production=buildCinematicProduction({cuts,duration:Number(editPlan.targetDuration||duration)||duration,bpm,energy,mood,hasSourceAudio,prompt});
 const renderPlan=adaptCinematicPlanForRenderer(production);
 return {version:'production-bridge-v1',mediaItems,sourceCount:mediaItems.length,production,renderPlan,ready:Boolean(renderPlan.renderContract?.continuous&&renderPlan.qa?.pass),preservesUploadedMedia:true};
}
