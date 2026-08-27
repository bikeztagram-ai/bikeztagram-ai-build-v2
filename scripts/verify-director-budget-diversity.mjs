import assert from 'node:assert/strict';
import { selectDirectorMoments } from '../src/directorSelection.js';

const moments = [
  { mediaIndex: 0, start: 0, duration: 2.5, description: 'wide establishing road shot, low angle, static composition', score: 9 },
  { mediaIndex: 0, start: 3, duration: 2.5, description: 'wide establishing road shot, low angle, static composition', score: 9 },
  { mediaIndex: 1, start: 0, duration: 1.5, description: 'close-up motorcycle detail, eye level, tight composition', score: 8 },
  { mediaIndex: 1, start: 2, duration: 1.5, description: 'rider action accelerating, tracking camera, diagonal composition', score: 8 },
  { mediaIndex: 2, start: 0, duration: 1.5, description: 'medium rider portrait, front angle, centered composition', score: 8 },
  { mediaIndex: 2, start: 3, duration: 1.5, description: 'hero landscape sunset, rear angle, open composition', score: 8 },
  { mediaIndex: 3, start: 0, duration: 5, description: 'wide road journey, low angle, static composition', score: 10 },
];

const result = selectDirectorMoments(moments, {
  maxCuts: 6,
  targetDuration: 8,
  creativePrompt: 'cinematic motorcycle reveal with energetic action and a strong ending',
});

assert.ok(result.length >= 3 && result.length <= 6);
const duration = result.reduce((sum, shot) => sum + Number(shot.duration || 0), 0);
assert.ok(duration <= 8.75, `selection exceeded target budget: ${duration}s`);
assert.equal(result[0].editorialRole, 'hook');
assert.equal(result.at(-1).editorialRole, 'hero-ending');
assert.ok(result.every((shot) => Number.isFinite(shot.directorSelectionScore)));
assert.ok(result.every((shot) => typeof shot.directorVisualSignature === 'string'));
assert.ok(new Set(result.map((shot) => shot.directorShotFamily)).size >= 3);
assert.ok(new Set(result.map((shot) => shot.mediaIndex)).size >= 3);

console.log('director-budget-diversity: PASS');
