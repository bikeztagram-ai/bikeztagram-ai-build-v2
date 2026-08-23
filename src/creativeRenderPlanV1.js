/* Creative Render Plan V1: joins editorial enhancement + content/music transitions into one renderer-ready plan. */
import { applyDirectedTransitions } from './transitionDirectorV2.js';
import { enhanceCreativeCuts, validateEnhancedCuts } from './creativeEditEnhancerV1.js';
import { normalizeContinuousTimeline, validateNoBlackGaps } from './cinematicTimelineV2.js';

export function buildCreativeRenderPlanV1(plan={},music={}){
 const duration=Number(plan.targetDuration)||Number(music.duration)||15;
 const directed=applyDirectedTransitions(Array.isArray(plan.cuts)?plan.cuts:[],music);
 const enhanced=enhanceCreativeCuts(directed,{duration,music});
 const timeline=normalizeContinuousTimeline(enhanced,duration);
 const valid=validateEnhancedCuts(timeline.cuts);
 const gapCheck=validateNoBlackGaps(timeline);
 return {...plan,targetDuration:duration,cuts:timeline.cuts,renderContract:{version:'creative-render-v1',editorialEffects:true,musicAwareTransitions:true,continuousTimeline:gapCheck.pass,enhancedCuts:valid.pass,generatedContinuityRequired:timeline.cuts.some(c=>c.generated||c.sourceType==='generated')}};
}
