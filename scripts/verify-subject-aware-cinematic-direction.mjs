import assert from 'node:assert/strict';
import { buildShotDirection, buildShotMotion, classifyMediaSubject } from '../src/director.js';
import { refineCinematicTimeline } from '../src/timelineDirector.js';

assert.equal(classifyMediaSubject({ name: 'blue motorcycle cornering video' }), 'vehicle');
assert.equal(buildShotMotion({ role: 'action', subjectType: 'vehicle' }).type, 'tracking-push-pan');
assert.equal(buildShotMotion({ role: 'action', subjectType: 'person' }).type, 'orbit-push');
assert.equal(buildShotMotion({ role: 'hero-ending', subjectType: 'product' }).type, 'precision-push');
assert.equal(buildShotDirection({ role: 'hero-ending', subjectType: 'vehicle' }).preserveSubject, true);
assert.equal(buildShotDirection({ role: 'action', subjectType: 'vehicle' }).motion.type, 'orbit-push');
assert.equal(buildShotDirection({ role: 'action', subjectType: 'vehicle' }).motion.intensity, 1.15);

const timeline = refineCinematicTimeline([
  { mediaId: 'bike-a', name: 'motorcycle cornering', duration: 2 },
  { mediaId: 'bike-b', name: 'motorcycle road ride', duration: 2 },
  { mediaId: 'bike-c', name: 'motorcycle hero reveal', duration: 2 }
], { creativePrompt: 'dark cinematic action trailer' });
assert.equal(timeline.length, 3);
assert.ok(timeline.every(cut => cut.subjectType === 'vehicle'));
assert.ok(timeline.some(cut => cut.motionStyle === 'orbit-push'));
assert.ok(timeline.every(cut => cut.coverage.preserveSubject === true));
console.log('subject-aware-cinematic-direction: PASS');
