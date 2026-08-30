import assert from 'node:assert/strict';
import { refineCinematicTimeline, timelineSummary } from '../src/timelineDirector.js';

const input = [
  { mediaId: 'a', duration: 2.2, subjectType: 'vehicle', editorialRole: 'hook', directorSelectionScore: 91, directorSelectionIndex: 0, cameraIntent: 'low tracking shot' },
  { mediaId: 'b', duration: 2.5, subjectType: 'vehicle', editorialRole: 'action', directorSelectionScore: 88, directorSelectionIndex: 1, cameraIntent: 'side tracking' },
  { mediaId: 'c', duration: 2.0, subjectType: 'vehicle', editorialRole: 'hero-ending', directorSelectionScore: 84, directorSelectionIndex: 2, cameraIntent: 'hero reveal' },
];
const refined = refineCinematicTimeline(input, { creativePrompt: 'fast cinematic motorcycle reel' });
assert.equal(refined.length, 3);
assert.deepEqual(refined.map(c => c.mediaId), ['a', 'b', 'c']);
assert.deepEqual(refined.map(c => c.role), ['hook', 'action', 'hero-ending']);
assert.deepEqual(refined.map(c => c.coverage.directorSelectionScore), [91, 88, 84]);
assert.deepEqual(refined.map(c => c.coverage.directorSelectionIndex), [0, 1, 2]);
assert.ok(refined.every(c => c.coverage.preserveSubject === true));
assert.ok(refined.some(c => c.transition === 'fade-in'));
assert.ok(refined.some(c => c.motionStyle && c.motionStyle !== 'static'));
const summary = timelineSummary(refined);
assert.deepEqual(summary.sources, ['a', 'b', 'c']);
assert.equal(summary.cuts, 3);
console.log('director-timeline-handoff: PASS');
