import { buildProductionBridge } from '../src/productionBridge.js';
const result=buildProductionBridge({mediaItems:[{id:'source-0',type:'video'},{id:'source-1',type:'video'}],editPlan:{targetDuration:10,cuts:[{sourceIndex:0,duration:2,purpose:'opening'},{sourceIndex:1,duration:3,purpose:'reveal'},{sourceIndex:0,duration:2,purpose:'action'},{sourceIndex:1,duration:3,purpose:'hero'}]},prompt:'dark cinematic motorcycle film',duration:10,hasSourceAudio:true});
if(result.sourceCount!==2||!result.preservesUploadedMedia)throw new Error('Source media contract lost.');
if(!result.renderPlan?.renderContract?.continuous)throw new Error('Continuous renderer contract missing.');
if(result.renderPlan.cuts.some(c=>!c.mediaIndex&&c.mediaIndex!==0))throw new Error('Media index lost.');
if(result.renderPlan.timeline?.gaps?.length)throw new Error('Bridge produced timeline gaps.');
console.log('PASS: uploaded media/edit plan bridges into continuous cinematic production and renderer contract.');
