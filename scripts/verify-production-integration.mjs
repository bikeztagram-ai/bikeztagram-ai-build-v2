import { prepareCinematicRender } from '../src/productionIntegration.js';
const out=prepareCinematicRender({sources:[{id:'source-0',type:'video',mimeType:'video/mp4'}],plan:{targetDuration:8,cuts:[{sourceIndex:0,duration:2,purpose:'opening'},{sourceIndex:0,duration:2,purpose:'reveal'},{sourceIndex:0,duration:2,purpose:'action'},{sourceIndex:0,duration:2,purpose:'hero'}]},prompt:'cinematic motorcycle film',targetDuration:8,music:{audioAvailable:true,bpm:112,energy:.8,mood:'dark cinematic'}});
if(!out.renderPlan?.renderContract?.continuous)throw new Error('Continuous render integration missing.');
if(!out.renderPlan?.renderContract?.qaRequired)throw new Error('QA gate missing.');
if(!out.renderPlan?.music?.audioAvailable)throw new Error('Generated soundtrack was not preserved.');
if(out.renderPlan.cuts.length!==4)throw new Error('Cut count changed during integration.');
console.log('PASS: app-safe integration preserves media cuts, cinematic contract, QA and soundtrack.');
