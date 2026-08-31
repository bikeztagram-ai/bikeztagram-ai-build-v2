import assert from 'node:assert/strict';
import { buildExecutableScenePlan } from '../src/cinematicDirectorBridge.js';
import { validateDirectorRenderCues } from '../src/directorRenderRuntime.js';

const executable=buildExecutableScenePlan({
  creativePrompt:'fast cinematic motorcycle reveal',
  targetDuration:9,
  scenePlan:{slots:[
    {mediaIndex:0,duration:2,purpose:'opening establishing road',subjectType:'environment'},
    {mediaIndex:1,duration:2.5,purpose:'rider acceleration action',subjectType:'vehicle'},
    {mediaIndex:2,duration:2.5,purpose:'motorcycle reveal',subjectType:'vehicle'},
    {mediaIndex:3,duration:2,purpose:'hero ending',subjectType:'vehicle'}
  ]}
});
const validation=validateDirectorRenderCues(executable);
assert.equal(validation.ok,true,validation.errors.join(', '));
assert.deepEqual(executable.cuts.map(c=>c.role),['hook','action','reveal','hero-ending']);
assert.ok(executable.cuts.every(c=>c.motionStyle&&c.transition));
assert.ok(executable.cuts.every(c=>c.purpose===c.role));
assert.ok(executable.cuts.every(c=>c.motionStyle));
assert.equal(executable.cuts[1].motionStyle,'cinematic');
assert.equal(executable.cuts[2].motionStyle,'orbit');
assert.equal(executable.cuts[1].speedEnd,1.7);
assert.equal(executable.cuts[3].transition,'fade-out');
assert.ok(executable.renderCues.every(c=>c.directorExecution?.role));
console.log('Director render handoff integrity: PASS');
