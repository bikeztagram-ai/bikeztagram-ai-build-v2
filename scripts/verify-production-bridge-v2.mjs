import {buildProductionBridge} from '../src/productionBridge.js';
const out=buildProductionBridge({mediaItems:[{id:'bike',type:'video'}],editPlan:{targetDuration:30,cuts:[{sourceIndex:0,start:0,duration:6,purpose:'opening'},{sourceIndex:0,start:6,duration:8,purpose:'build'},{sourceIndex:0,start:14,duration:9,purpose:'action'},{sourceIndex:0,start:23,duration:7,purpose:'hero'}]},prompt:'dark energetic cinematic motorcycle trailer',duration:30,hasSourceAudio:true});
if(out.version!=='production-bridge-v2')throw new Error('Bridge v2 not active.');
if(!out.decisions?.contracts?.musicDrivesEdit)throw new Error('Music/edit decision contract missing.');
if(!out.production?.music?.composition?.providerRequest)throw new Error('Long-form music plan not propagated.');
if(out.renderPlan.cuts.length!==4)throw new Error('Production cut count changed.');
if(out.renderPlan.cuts.some((c,i)=>i>0&&!c.transition))throw new Error('Transition decision not propagated.');
if(!out.decisions.scenePolicy.hasRealFootage||out.decisions.scenePolicy.generatedScenesEnabled)throw new Error('Real-footage policy failed.');
console.log('PASS: production bridge v2 propagates music, transitions and real-footage decisions to renderer.');
