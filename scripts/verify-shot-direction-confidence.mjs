import assert from 'node:assert/strict';
import { buildShotDirection, buildShotMotion } from '../src/director.js';

const hero = buildShotDirection({ editorialRole: 'hero-ending', subjectType: 'vehicle', confidence: 0.9, duration: 3 });
assert.equal(hero.role, 'hero-ending');
assert.equal(hero.cameraIntent, 'hold-and-settle');
assert.equal(hero.motion.type, 'slow-arc');
assert.ok(hero.directionConfidence > 0.7);
assert.equal(hero.confidenceEvidence.editorialRoleKnown, true);

const hook = buildShotDirection({ purpose: 'hook', subjectType: 'person', confidence: 0.8, duration: 2 });
assert.equal(hook.role, 'hook');
assert.equal(hook.cameraIntent, 'immediate-attention');
assert.equal(hook.motion.type, 'gentle-follow');

const action = buildShotMotion({ editorialRole: 'action', subjectType: 'vehicle', duration: 4 });
assert.equal(action.type, 'tracking-push-pan');

const unknown = buildShotDirection({ subjectType: 'unknown' });
assert.equal(unknown.role, 'story-beat');
assert.equal(unknown.confidenceEvidence.subjectKnown, false);
assert.ok(unknown.directionConfidence >= 0 && unknown.directionConfidence <= 1);

console.log('shot-direction-confidence: PASS');
