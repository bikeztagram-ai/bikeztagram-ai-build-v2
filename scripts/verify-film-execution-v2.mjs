import {buildFilmExecutionPlan} from '../src/filmExecutionPlanV2.js';
const p=buildFilmExecutionPlan({mediaItems:[{type:'video',id:'bike'}],prompt:'5 minute dark cinematic motorcycle film',requestedDuration:300,cuts:[{start:0,duration:5,purpose:'opening'},{start:5,duration:10,purpose:'build'},{start:15,duration:10,purpose:'action'},{start:25,duration:10,purpose:'hero'}]});
if(p.duration!==300||!p.policy.long||!p.policy.compositionRequired)throw new Error('Long-film duration policy failed.');
if(!p.execution.realFootageFirst||!p.execution.musicDrivesEdit||!p.execution.continuousTimeline)throw new Error('Execution contracts failed.');
if(!p.ready||!p.render.qa.noBlackGaps)throw new Error('Film render contract is not ready.');
console.log('PASS: end-to-end film execution plan verified for long-form real footage.');
