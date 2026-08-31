import assert from 'node:assert/strict';
import { planEditorialRhythm } from '../src/editorialRhythm.js';
const cuts=[
 {editorialRole:'hook',score:90},{editorialRole:'build',score:80},{editorialRole:'reveal',score:88},{editorialRole:'action',score:94},{editorialRole:'hero',score:91}
];
const result=planEditorialRhythm(cuts,{targetDuration:10,creativePrompt:'cinematic energetic reveal'});
assert.equal(result.length,5);
assert.equal(result[0].pacing,'immediate');
assert.equal(result[2].pacing,'controlled');
assert.equal(result[3].pacing,'driving-fast');
assert.equal(result[4].pacing,'resolved');
assert.ok(result.every(c=>c.rhythmDuration>=.55&&c.rhythmDuration<=3));
assert.ok(result.every(c=>c.beatPosition>=0&&c.beatPosition<=1));
console.log('editorial-rhythm-pass: PASS');
