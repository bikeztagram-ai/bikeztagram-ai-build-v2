import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectDirectorMoments } from '../src/directorSelection.js';
const selector=fs.readFileSync(new URL('../src/directorSelection.js',import.meta.url),'utf8');
assert.match(selector,/durationOf/);
assert.match(selector,/durationFit/);
assert.match(selector,/usedDuration/);
const moments=[
 {mediaIndex:0,start:0,duration:2,description:'quiet opening establishing shot',score:9},
 {mediaIndex:0,start:5,duration:2,description:'motorbike accelerating fast action',score:10},
 {mediaIndex:1,start:0,duration:2,description:'wide reveal of the bike',score:8},
 {mediaIndex:1,start:2,duration:2,description:'close detail of the bike',score:8},
 {mediaIndex:2,start:0,duration:2,description:'hero landscape final resolution',score:9},
 {mediaIndex:2,start:3,duration:2,description:'similar hero landscape',score:7}
];
const result=selectDirectorMoments(moments,{maxCuts:5,targetDuration:10,creativePrompt:'cinematic reveal with energetic action and a powerful ending'});
assert.equal(result.length,5);
assert.equal(result[0].editorialRole,'hook');
assert.equal(result.at(-1).editorialRole,'hero-ending');
assert.ok(new Set(result.map(x=>x.mediaIndex)).size>=3);
assert.ok(result.every(x=>Number.isFinite(x.directorSelectionScore)));
assert.ok(result.every((x,i)=>i===0||Number(x.start)>=Number(result[i-1].start)));
const selectedDuration=result.reduce((sum,x)=>sum+Number(x.duration||0),0);
assert.ok(selectedDuration<=12,'director should stay close to the target duration budget');
assert.ok(selectedDuration>=7,'director should still produce a useful amount of story');
console.log(`batch77-director-duration-budget: PASS (${selectedDuration.toFixed(1)}s selected for 10s target)`);
