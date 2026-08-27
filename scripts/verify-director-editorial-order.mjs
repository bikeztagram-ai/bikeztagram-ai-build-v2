import assert from 'node:assert/strict';
import { selectDirectorMoments } from '../src/directorSelection.js';

const moments = [
  { mediaIndex: 0, startTime: 1, duration: 2, score: 82, description: 'quiet road establishing shot', shotType: 'wide' },
  { mediaIndex: 0, startTime: 8, duration: 2, score: 96, description: 'hero reveal of the motorcycle at sunset', shotType: 'wide', editorialRole: 'hero-ending' },
  { mediaIndex: 0, startTime: 3, duration: 2, score: 92, description: 'fast motorcycle action accelerating through the road', shotType: 'action' },
  { mediaIndex: 0, startTime: 5, duration: 2, score: 90, description: 'close detail of the motorcycle cockpit', shotType: 'detail' },
  { mediaIndex: 0, startTime: 6.8, duration: 2, score: 84, description: 'rider tracking through a sweeping corner', shotType: 'medium' }
];

const selected = selectDirectorMoments(moments, {
  maxCuts: 4,
  targetDuration: 10,
  creativePrompt: 'Create a cinematic motorcycle trailer with action, reveal and a powerful hero ending.'
});

assert.equal(selected.length, 4);
assert.equal(selected[0].editorialRole, 'hook', 'first selected shot must remain the hook');
assert.equal(selected.at(-1).editorialRole, 'hero-ending', 'last selected shot must remain the hero ending');
assert.equal(selected[0].startTime, 3, 'the action/reveal candidate chosen as hook should not be displaced by timestamp sorting');
assert.equal(selected.at(-1).startTime, 8, 'the strongest hero candidate should remain the final editorial shot');
assert.deepEqual(selected.map((shot) => shot.directorSelectionIndex), [2, 3, 4, 1], 'selection order should remain intact for narrative assembly');

console.log('director-editorial-order: PASS');
