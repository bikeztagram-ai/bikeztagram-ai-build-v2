import { buildStoryArc, diversifyStorySelections } from './storyArcEngine.js';
import { buildSoundtrackBrief, alignCutsToMusic } from './musicDirector.js';
import { guardRenderPlan } from './renderDecisionGuard.js';

export function preparePretestPipeline({moments=[],prompt='',cuts=[],duration=15,music={}}={}){
  const storyArc=buildStoryArc(moments,prompt);
  const ranked=diversifyStorySelections(storyArc.map((slot,i)=>({index:slot.momentIndex,moment:moments[slot.momentIndex],score:slot.score,role:slot.role})));
  const soundtrack=buildSoundtrackBrief({prompt,duration,bpm:music.bpm,genre:music.genre,mood:music.mood,energy:music.energy});
  const beatAligned=alignCutsToMusic(cuts,soundtrack);
  const renderPlan=guardRenderPlan({cuts:beatAligned,duration});
  return {version:'pretest-pipeline-v1',storyArc,selections:ranked,soundtrack,renderPlan};
}
