import { buildStoryArc, diversifyStorySelections } from './storyArcEngine.js';
import { buildSoundtrackBrief, alignCutsToMusic } from './musicDirector.js';
import { guardRenderPlan } from './renderDecisionGuard.js';

export function prepareIntegratedRuntime({analysis,plan,prompt='',duration=15}={}){
 const moments=Array.isArray(plan?.directorSelection)?plan.directorSelection:Array.isArray(analysis?.bestMoments)?analysis.bestMoments:[];
 const story=buildStoryArc(moments,prompt);
 const selections=diversifyStorySelections(story.map((s,i)=>({...s,moment:moments[s.momentIndex]||{},index:s.momentIndex})));
 const music=buildSoundtrackBrief({prompt,duration});
 const cuts=alignCutsToMusic(Array.isArray(plan?.cuts)?plan.cuts:[],music);
 const guarded=guardRenderPlan({...plan,cuts});
 return {story,selections,music,renderPlan:guarded};
}
