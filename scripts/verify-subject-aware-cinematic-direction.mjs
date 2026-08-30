import assert from 'node:assert/strict';
import { buildShotDirection, buildShotMotion, classifyMediaSubject, scoreMedia } from '../src/director.js';
import { refineCinematicTimeline } from '../src/timelineDirector.js';

assert.equal(classifyMediaSubject({ name: 'blue motorcycle cornering video' }), 'vehicle');
assert.equal(classifyMediaSubject({ name: 'red scooter riding video' }), 'vehicle');
assert.equal(classifyMediaSubject({ name: 'ATV quad trail footage' }), 'vehicle');
assert.equal(buildShotMotion({ role: 'action', subjectType: 'vehicle' }).type, 'tracking-push-pan');
assert.equal(buildShotMotion({ role: 'action', subjectType: 'person' }).type, 'orbit-push');
assert.equal(buildShotMotion({ role: 'hero-ending', subjectType: 'product' }).type, 'precision-push');
assert.equal(buildShotDirection({ role: 'hero-ending', subjectType: 'vehicle' }).preserveSubject, true);

const parked = scoreMedia({ type: 'video', name: 'motorcycle parked', duration: 5, width: 1920, height: 1080 });
const action = scoreMedia({ type: 'video', name: 'motorcycle accelerating cornering chase', duration: 5, width: 1920, height: 1080, actionScore: .9, cinematicScore: .85, compositionScore: .8 });
const long = scoreMedia({ type: 'video', name: 'motorcycle moving', duration: 40, width: 1920, height: 1080 });
const medium = scoreMedia({ type: 'video', name: 'motorcycle moving', duration: 6, width: 1920, height: 1080 });
assert.ok(action > parked + 20, `action footage should materially outrank parked footage: ${action} vs ${parked}`);
assert.ok(medium >= long, `very long footage should not outrank a social-friendly clip: ${medium} vs ${long}`);
assert.ok(action <= 100 && parked >= 0);

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
