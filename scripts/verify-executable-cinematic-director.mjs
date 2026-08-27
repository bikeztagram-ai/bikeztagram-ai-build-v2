import assert from 'node:assert/strict';
import { buildExecutableScenePlan } from '../src/cinematicDirectorBridge.js';
import { validateRenderCueTrack } from '../src/cinematicRuntime.js';

const result = buildExecutableScenePlan({
  creativePrompt: 'dark cinematic motorcycle trailer with a strong reveal and action',
  targetDuration: 8,
  scenePlan: {
    strategy: 'real media first',
    slots: [
      { id: 'hook', role: 'opening', start: 0, duration: 2, generation: 'optional', subjectType: 'vehicle' },
      { id: 'reveal', role: 'reveal', start: 2, duration: 2, generation: 'preferred', subjectType: 'vehicle' },
      { id: 'action', role: 'action', start: 4, duration: 2, generation: 'preferred', subjectType: 'vehicle' },
      { id: 'hero', role: 'hero', start: 6, duration: 2, generation: 'optional', subjectType: 'vehicle' }
    ]
  },
  beats: [0, 2, 4, 6]
});

assert.equal(result.version, 'executable-scene-plan-v1');
assert.equal(result.clips.length, 4);
assert.equal(result.renderCues.length, 4);
assert.equal(result.cuts.length, 4);
assert.ok(result.totalDuration <= 8);
assert.equal(result.renderCues[0].motion, 'slow-push');
assert.equal(result.renderCues[1].motion, 'orbit');
assert.equal(result.renderCues[1].transition, 'crossfade');
assert.equal(result.renderCues[2].transition, 'flash-cut');
assert.equal(result.renderCues[2].speedEnd, 1.7);
assert.equal(result.renderCues[3].transition, 'fade-out');
assert.ok(result.renderCues.every(cue => cue.editorialOrder >= 0));
assert.equal(validateRenderCueTrack(result.renderCues).valid, true);
assert.ok(result.cuts.every(cut => cut.motionStyle === result.renderCues[result.cuts.indexOf(cut)].motion));

console.log('Executable cinematic director verification: PASS');
console.log(JSON.stringify({
  cueCount: result.renderCues.length,
  cutCount: result.cuts.length,
  totalDuration: result.totalDuration,
  motions: result.renderCues.map(cue => cue.motion),
  transitions: result.renderCues.map(cue => cue.transition),
  speedRamps: result.renderCues.filter(cue => cue.speedEnd !== cue.speed).length
}, null, 2));
