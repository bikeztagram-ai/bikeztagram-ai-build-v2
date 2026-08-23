import {buildRendererContract} from '../src/renderContractV2.js';
import {buildLongFormAudioPlan} from '../src/longFormAudioPlanV2.js';
const render=buildRendererContract({duration:20,cuts:[{start:0,duration:4},{start:8,duration:4},{start:15,duration:5}],music:{duration:20,beatGrid:{beats:[{time:0},{time:1}]},sections:[{id:'intro'}]}});
if(!render.continuous||!render.qa.noBlackGaps||render.timeline.gaps!==0)throw new Error('Renderer gap-free contract failed.');
if(render.audio.duration!==20||render.audio.beatMap.length!==2)throw new Error('Renderer audio metadata failed.');
const audio=buildLongFormAudioPlan({duration:300,composition:{duration:300,sections:[{id:'a',start:0,end:100},{id:'b',start:100,end:200},{id:'c',start:200,end:300}]}});
if(audio.sections.length!==3||!audio.continuity.sharedTheme||!audio.continuity.noForcedLoop)throw new Error('Long-form audio continuity failed.');
console.log('PASS: renderer contract is gap-free and long-form audio continuity is enforced.');
