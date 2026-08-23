import { buildCreativeProductionRuntime, validateCreativeProductionRuntime } from '../src/creativeProductionRuntimeV1.js';
const runtime=buildCreativeProductionRuntime({mediaItems:[{id:'bike-1',type:'video'}],prompt:'dark cinematic motorcycle film',duration:30,cuts:[{purpose:'opening',start:0,duration:5,sourceIndex:0}],musicEvents:[{type:'drop',time:5}],subjectIds:['bike'],generatedScenes:[{id:'generated-1',role:'reveal',start:5,duration:2,continuity:{anchorFrame:'frame-1'}}]});
const checked=validateCreativeProductionRuntime(runtime); if(!checked.ok)throw new Error(checked.reason);
if(runtime.stages.length!==8)throw new Error('Production runtime stage chain incomplete.');
if(!runtime.decision?.music?.composition)throw new Error('Music direction missing from runtime.');
if(!runtime.generatedPlacement?.candidates?.length)throw new Error('Generated placement stage missing.');
if(!runtime.decision?.generatedPlacement?.candidates?.length)throw new Error('Decision pipeline did not receive generated scene blueprints.');
if(runtime.decision.generatedPlacement.candidates[0].sceneId!=='generated-1')throw new Error('Generated scene identity was lost between runtime and decision pipeline.');
console.log('PASS: media intake through direction, music, generated placement, continuity, transitions, render and QA are represented in one production runtime, with generated blueprints reaching the decision layer.');
