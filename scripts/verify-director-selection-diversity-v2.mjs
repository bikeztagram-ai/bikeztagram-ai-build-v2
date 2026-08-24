import assert from 'node:assert/strict';
import { selectDirectorMoments } from '../src/directorSelection.js';

const moments = [
  { mediaId: 'badge-1', mediaIndex: 0, description: 'extreme close-up of Ninja badge', shotType: 'close-up', score: 98, confidence: 0.98, start: 0 },
  { mediaId: 'badge-2', mediaIndex: 1, description: 'tight macro close-up of Ninja badge', shotType: 'macro', score: 97, confidence: 0.98, start: 1 },
  { mediaId: 'badge-3', mediaIndex: 2, description: 'another close-up profile of Ninja badge', shotType: 'close-up', score: 96, confidence: 0.97, start: 2 },
  { mediaId: 'wide-1', mediaIndex: 3, description: 'wide establishing shot of the motorcycle and road', shotType: 'wide', score: 90, confidence: 0.95, start: 3 },
  { mediaId: 'move-1', mediaIndex: 4, description: 'motorcycle moving through the road with dynamic motion', shotType: 'tracking', score: 92, confidence: 0.94, start: 5 },
  { mediaId: 'profile-1', mediaIndex: 5, description: 'three-quarter motorcycle profile revealing the full silhouette', shotType: 'three-quarter', score: 91, confidence: 0.95, start: 7 },
  { mediaId: 'hero-1', mediaIndex: 6, description: 'hero ending shot of the motorcycle at sunset', shotType: 'wide', score: 89, confidence: 0.96, editorialRole: 'hero-ending', start: 9 }
];

const selected = selectDirectorMoments(moments, { maxCuts: 5, targetDuration: 15, creativePrompt: 'dark cinematic reveal with action and a strong hero ending' });
assert.equal(selected.length, 5, 'selector should honour the requested cut budget when enough material exists');
assert.equal(selected[0].editorialRole, 'hook', 'first selected moment should be a hook');
assert.equal(selected.at(-1).editorialRole, 'hero-ending', 'last selected moment should be a hero ending');
const detailCount = selected.filter(m => /detail|close-up|macro/.test(String(m.description).toLowerCase() + ' ' + String(m.shotType).toLowerCase())).length;
assert.ok(detailCount <= 2, `selector should cap repetitive detail coverage; got ${detailCount}`);
const uniqueSources = new Set(selected.map(m => String(m.mediaId ?? m.mediaIndex)));
assert.equal(uniqueSources.size, selected.length, 'selector should avoid reusing the same source when alternatives exist');
const hasWide = selected.some(m => /wide|establishing/.test(String(m.description).toLowerCase() + ' ' + String(m.shotType).toLowerCase()));
const hasMotion = selected.some(m => /moving|motion|tracking|action|speed/.test(String(m.description).toLowerCase()));
assert.ok(hasWide, 'story selection should preserve establishing coverage');
assert.ok(hasMotion, 'story selection should preserve movement/action coverage');

console.log('Director selection diversity v2 verification passed.');
