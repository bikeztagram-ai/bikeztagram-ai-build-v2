import {chooseTransition,applyDirectedTransitions} from '../src/transitionDirectorV2.js';
if(chooseTransition({from:{purpose:'action'},to:{purpose:'action'},beatStrength:.9,energy:.9})!=='whip')throw new Error('Action transition policy failed.');
if(chooseTransition({from:{purpose:'reveal'},to:{purpose:'hero'},beatStrength:.95})!=='impact-cut')throw new Error('Reveal transition policy failed.');
const out=applyDirectedTransitions([{purpose:'opening',start:0},{purpose:'build',start:2},{purpose:'action',start:4},{purpose:'hero',start:6}],{duration:8,energy:.85,beatGrid:{beats:[{time:0,downbeat:true},{time:2,downbeat:true},{time:4,downbeat:true},{time:6,downbeat:true}]}});
if(out.length!==4||out[0].transition!=='cut'||!out[2].transitionReason.includes('music'))throw new Error('Directed transition output invalid.');
console.log('PASS: transitions are content-aware and music-aware.');
