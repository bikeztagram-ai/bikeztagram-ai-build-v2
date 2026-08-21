import assert from 'node:assert/strict';
import { selectDirectorMoments } from '../src/directorSelection.js';
const moments=[
 {mediaIndex:0,start:0,duration:2,description:'quiet opening establishing shot',score:8},
 {mediaIndex:0,start:2,duration:2,description:'motorbike accelerating fast action',score:9},
 {mediaIndex:1,start:0,duration:2,description:'wide reveal of the bike',score:8},
 {mediaIndex:1,start:3,duration:2,description:'close detail of the bike',score:7},
 {mediaIndex:2,start:0,duration:2,description:'hero landscape final resolution',score:8},
 {mediaIndex:2,start:3,duration:2,description:'similar hero landscape',score:7}
];
const result=selectDirectorMoments(moments,{maxCuts:5,targetDuration:15,creativePrompt:'cinematic reveal with energetic action and a powerful ending'});
assert.equal(result.length,5);
assert.equal(result[0].editorialRole,'hook');
assert.equal(result.at(-1).editorialRole,'hero-ending');
assert.ok(new Set(result.map(x=>x.mediaIndex)).size>=3);
assert.ok(result.every(x=>Number.isFinite(x.directorSelectionScore)));
assert.ok(result.every((x,i)=>i===0||Number(x.start)>=Number(result[i-1].start)));
console.log('batch49-director-selection: PASS');
