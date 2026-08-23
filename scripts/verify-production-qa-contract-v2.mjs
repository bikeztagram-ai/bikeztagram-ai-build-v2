import {prepareCinematicRender} from '../src/productionIntegration.js';
const result=prepareCinematicRender({sources:[{type:'video',mimeType:'video/mp4'}],prompt:'cinematic motorcycle film',targetDuration:30,plan:{cuts:[{start:0,duration:8,purpose:'opening'},{start:8,duration:10,purpose:'action'},{start:18,duration:12,purpose:'hero'}]}});
if(!result.renderPlan)throw new Error('Production render plan missing.');
if(!result.renderPlan.renderContract?.continuous)throw new Error('Production render contract is not continuous.');
if(result.renderPlan.renderContract?.qa?.noBlackGaps!==true)throw new Error('Production QA no-black-gap contract missing.');
if(result.renderPlan.qaRequired!==true)throw new Error('Production QA required contract missing.');
console.log('PASS: production integration exposes explicit QA-required contract.');
