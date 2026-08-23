import {buildProductionRuntime} from '../src/productionRuntime.js';
const r=buildProductionRuntime({mediaItems:[{type:'video',sourceUrl:'blob'}],prompt:'5 minute cinematic motorcycle film',music:{genre:'cinematic',mood:'dark',energy:.8,bpm:112},cuts:[{start:0,duration:8,purpose:'opening'},{start:8,duration:12,purpose:'action'},{start:20,duration:10,purpose:'hero'}]});
if(r.duration!==300||r.music.duration!==300||r.render.duration!==300)throw new Error('Duration was not propagated through runtime.');
if(!r.policy.compositionRequired)throw new Error('Long-form composition policy missing.');
console.log('PASS: production runtime propagates requested duration to plan, music and render.');
