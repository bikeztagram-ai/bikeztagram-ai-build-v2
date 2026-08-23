import {prepareCinematicRender} from '../src/productionIntegration.js';
const out=prepareCinematicRender({sources:[{type:'video',mimeType:'video/mp4'}],prompt:'cinematic motorcycle film',targetDuration:30,plan:{cuts:[{start:0,duration:10,purpose:'opening'},{start:10,duration:10,purpose:'action'},{start:20,duration:10,purpose:'hero'}]}});
if(out.renderPlan?.qaRequired!==true)throw new Error('Top-level QA gate missing.');
if(out.renderPlan?.renderContract?.qaRequired!==true)throw new Error('Renderer-contract QA gate missing.');
if(out.renderPlan?.renderContract?.qa?.required!==true)throw new Error('Renderer-contract QA requirement missing.');
console.log('PASS: QA gate is exposed at both production and renderer-contract boundaries.');
