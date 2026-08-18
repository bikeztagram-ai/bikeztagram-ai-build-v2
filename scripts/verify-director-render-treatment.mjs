import assert from 'node:assert/strict';
import { getDirectorRenderTreatment, applyDirectorRenderTreatment } from '../src/directorRenderTreatment.js';

const hook = getDirectorRenderTreatment({ storyRole: 'hook' });
assert.equal(hook.transition, 'fade-in');
assert.ok(hook.speedStart < 1);

const action = getDirectorRenderTreatment({ storyRole: 'escalation' });
assert.equal(action.transition, 'flash-cut');
assert.ok(action.speedEnd > action.speedStart);
assert.ok(action.motionBoost > 1);

const hero = getDirectorRenderTreatment({ storyRole: 'hero' });
assert.equal(hero.transition, 'fade-out');
assert.ok(hero.speedEnd < hero.speedStart);

const treated = applyDirectorRenderTreatment({ storyRole: 'escalation', motionIntensity: 0.8 });
assert.ok(treated.motionIntensity > 0.8);
assert.equal(treated.speed, 1.12);
assert.equal(treated.speedEnd, 1.3);
assert.equal(treated.directorVisualEnergy, 'impact');

console.log('director-render-treatment: PASS');
