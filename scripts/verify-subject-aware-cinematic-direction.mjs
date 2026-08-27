import assert from 'node:assert/strict';
import { buildShotDirection, buildShotMotion, classifyMediaSubject } from '../src/director.js';
import { refineCinematicTimeline } from '../src/timelineDirector.js';

assert.equal(classifyMediaSubject({ name: 'blue motorcycle cornering video' }), 'vehicle');
assert.equal(buildShotMotion({ role: 'action', subjectType: 'vehicle' }).type, 'tracking-push-pan');
assert.equal(buildShotMotion({ role: 'action', subjectType: 'person' }).type, 'orbit-push');
assert.equal(buildShotMotion({ role: 'hero-ending', subjectType: 'product' }).type, 'precision-push');
assert.equal(buildShotDirection({ role: 'hero-ending', subjectType: 'vehicle' }).preserveSubject, true);

const timeline = refineCinematicTimeline([
  { mediaId: 'bike-a', duration: 2 },
  { mediaId: 'bike-b', duration: 2 },
  { mediaId: 'bike-c', duration: 2 }
], { creativePrompt: 'dark cinematic action trailer' });
assert.equal(timeline.length, 3);
assert.ok(timeline.every(cut => cut.subjectType === 'vehicle'));
assert.ok(timeline.some(cut => cut.motionStyle === 'tracking-push-pan'));
assert.ok(timeline.every(cut => cut.coverage.preserveSubject === true));
console.log('subject-aware-cinematic-direction: PASS');
