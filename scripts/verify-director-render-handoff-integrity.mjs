import assert from 'node:assert/strict';
import { applyDirectorRenderCues, validateDirectorRenderCues } from '../src/directorRenderRuntime.js';
import { refineCinematicTimeline } from '../src/timelineDirector.js';

const input={creativePrompt:'fast cinematic motorcycle reveal',cuts:[
 {mediaIndex:0,duration:2,purpose:'opening establishing road',subjectType:'environment'},
 {mediaIndex:1,duration:2.5,purpose:'rider acceleration action',subjectType:'vehicle'},
 {mediaIndex:2,duration:2.5,purpose:'motorcycle reveal',subjectType:'vehicle'},
 {mediaIndex:3,duration:2,purpose:'hero ending',subjectType:'vehicle'}
]};
const timeline=refineCinematicTimeline(input.cuts,{creativePrompt:input.creativePrompt});
const executable=applyDirectorRenderCues({...input,cuts:timeline});
const validation=validateDirectorRenderCues(executable);
assert.equal(validation.ok,true,validation.errors.join(', '));
assert.deepEqual(executable.cuts.map(c=>c.role),['hook','action','action','hero-ending']);
assert.ok(executable.cuts.every(c=>c.motionStyle&&c.transition&&c.cameraIntent));
assert.ok(executable.cuts.every(c=>c.directorExecution?.role===c.role));
assert.ok(executable.cuts[1].motionIntensity>=1.05);
assert.ok(executable.directorRuntime?.applied);
console.log('Director render handoff integrity: PASS');
