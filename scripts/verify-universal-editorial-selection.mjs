import assert from 'node:assert/strict';
import { selectDirectorMoments } from '../src/directorSelection.js';
const moments=[
 {mediaIndex:0,startTime:0,description:'wide establishing city skyline at dusk',shotType:'wide',score:92},
 {mediaIndex:0,startTime:.4,description:'wide establishing city skyline at dusk',shotType:'wide',score:96},
 {mediaIndex:1,startTime:2.5,description:'medium person walking through street',shotType:'medium',score:84},
 {mediaIndex:2,startTime:5.5,description:'close-up product detail on table',shotType:'close-up',score:82},
 {mediaIndex:3,startTime:8.5,description:'fast action dog running across beach',shotType:'action',score:90},
 {mediaIndex:4,startTime:12,description:'hero portrait landscape at sunset',shotType:'wide',score:86}
];
const selected=selectDirectorMoments(moments,{maxCuts:5,targetDuration:15,creativePrompt:'cinematic emotional reveal'});
assert.equal(selected.length,5);assert.equal(selected[0].editorialRole,'hook');assert.equal(selected.at(-1).editorialRole,'hero-ending');assert.ok(new Set(selected.map(x=>x.directorShotFamily)).size>=3);assert.ok(new Set(selected.map(x=>x.mediaIndex)).size>=4);assert.ok(selected.every(x=>Number.isFinite(x.directorSelectionScore)));
console.log('universal-editorial-selection: PASS');
