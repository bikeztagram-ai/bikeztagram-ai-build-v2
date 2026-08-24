import { inspectCreativePlan, improveCreativePlan } from '../src/creativeEngineQa.js';

const base={
  creativePrompt:'Create an original cinematic motorcycle trailer with a futuristic night environment.',
  targetDuration:15,
  cuts:[
    {mediaIndex:0,duration:3,motionStyle:'slow-push',transition:'fade-in'},
    {mediaIndex:1,duration:4,motionStyle:'pan-right',transition:'hard-cut'},
    {mediaIndex:2,duration:4,motionStyle:'slow-push',transition:'flash-cut'},
    {mediaIndex:0,duration:4,motionStyle:'slow-pull',transition:'fade-out'}
  ]
};

const music={audioAvailable:true,audioDataUrl:'data:audio/wav;base64,AAAA',beatGrid:[0,.535,1.07,1.605],audioAnalysis:{bpm:112}};
const generatedScenes=[{generationPrompt:'Original futuristic night city with wet roads and cyan practical lighting; no existing franchise elements.'}];

const qa=inspectCreativePlan({plan:base,music,generatedScenes});
if(qa.verdict!=='PASS')throw new Error(`Expected PASS, received ${qa.summary}`);
if(qa.score<85)throw new Error(`Expected score >=85, received ${qa.score}`);

const unsafe={...base,creativePrompt:'Make it exactly like Star Wars.'};
const unsafeQa=inspectCreativePlan({plan:unsafe,music,generatedScenes});
if(unsafeQa.verdict!=='REVISE'||unsafeQa.errors[0]?.code!=='COPYRIGHT_STYLE_REQUEST')throw new Error('Copyright safety gate did not reject direct-copy request.');

const weak={...base,cuts:[{mediaIndex:0,duration:1}]};
const improved=improveCreativePlan(weak,{music,generatedScenes});
if(!improved.changed)throw new Error('Expected weak plan to receive an improvement pass.');
if(!improved.plan.cuts[0].motionStyle)throw new Error('Improvement pass did not add visual direction.');

console.log(`Creative Engine QA PASS • ${qa.score}/100 • safety gate PASS • improvement PASS`);
