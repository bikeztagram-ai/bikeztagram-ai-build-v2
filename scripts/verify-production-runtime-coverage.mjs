import {buildProductionRuntime} from '../src/productionRuntime.js';
const r=buildProductionRuntime({duration:300,prompt:'five minute cinematic motorcycle film',mediaItems:[{id:'a'},{id:'b'}],cuts:[{id:'a',duration:4,purpose:'opening'},{id:'b',duration:6,purpose:'action'}],music:{genre:'cinematic',bpm:112}});
if(r.duration!==300||r.plan.duration!==300||r.render.duration!==300)throw new Error('Runtime duration propagation failed.');
if(!r.plan.timeline.length)throw new Error('Runtime produced no timeline.');
const last=r.plan.timeline[r.plan.timeline.length-1];
if(last.end!==300)throw new Error(`Timeline ends at ${last.end}, expected 300.`);
for(let i=1;i<r.plan.timeline.length;i++)if(r.plan.timeline[i].start!==r.plan.timeline[i-1].end)throw new Error('Timeline contains a gap.');
if(r.plan.qa.expectedDuration!==300||r.music.duration!==300)throw new Error('QA/music duration mismatch.');
console.log('PASS: five-minute runtime propagates duration and produces gap-free full-duration coverage.');
