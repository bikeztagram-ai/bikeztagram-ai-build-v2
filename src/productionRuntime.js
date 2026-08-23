import {normalizeProductionDuration} from './productionDurationUI.js';
import {buildFilmExecutionPlan} from './filmExecutionPlanV2.js';
export function buildProductionRuntime({mediaItems=[],prompt='',duration,music={},cuts=[],filmType='trailer'}={}){
 const d=normalizeProductionDuration(duration,prompt);
 const plan=buildFilmExecutionPlan({mediaItems,prompt,requestedDuration:d.duration,cuts,genre:music.genre,mood:music.mood,energy:music.energy,bpm:music.bpm,filmType});
 return {duration:d.duration,durationLabel:d.label,policy:d.policy,plan,music:{...music,duration:d.duration},render:{...plan.render,duration:d.duration},ready:plan.ready};
}
