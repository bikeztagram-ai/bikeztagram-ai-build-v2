import assert from 'node:assert/strict';
import { selectDirectorMoments } from '../src/directorSelection.js';

const moments=[
  {mediaIndex:0,startTime:0,description:'wide establishing motorcycle road shot',shotType:'wide',score:92},
  {mediaIndex:0,startTime:0.4,description:'wide establishing motorcycle road shot',shotType:'wide',score:96},
  {mediaIndex:1,startTime:2.2,description:'medium tracking motorcycle approaching camera',shotType:'medium',score:84},
  {mediaIndex:2,startTime:5.5,description:'close-up detail of blue motorcycle tank',shotType:'close-up',score:82},
  {mediaIndex:3,startTime:8.5,description:'fast action motorcycle cornering',shotType:'action',score:90},
  {mediaIndex:4,startTime:12,description:'hero portrait motorcycle at sunset landscape',shotType:'wide',score:86},
];

const selected=selectDirectorMoments(moments,{maxCuts:5,targetDuration:15,creativePrompt:'dark cinematic motorcycle reveal with action'});
assert.equal(selected.length,5);
assert.equal(selected[0].editorialRole,'hook');
assert.equal(selected.at(-1).editorialRole,'hero-ending');
assert.ok(selected.some(m=>m.directorShotFamily==='detail'));
assert.ok(selected.some(m=>m.directorShotFamily==='action'));
assert.ok(new Set(selected.map(m=>m.directorShotFamily)).size>=3,'selection should cover at least three shot families');
assert.ok(new Set(selected.map(m=>m.mediaIndex)).size>=4,'selection should favour source diversity');
assert.ok(selected.every(m=>Number.isFinite(m.directorSelectionScore)));
assert.ok(selected.every(m=>m.directorSelectionScore>0));
console.log('director-diversity-pass: PASS');
