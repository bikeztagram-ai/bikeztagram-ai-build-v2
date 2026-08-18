import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDirectorRenderTreatment } from '../src/directorRenderTreatment.js';

const renderer = readFileSync(new URL('../src/renderer.js', import.meta.url), 'utf8');
assert.match(renderer, /applyDirectorRenderTreatment/);
assert.match(renderer, /const cut = applyDirectorRenderTreatment\(cuts\[index\]\)/);
assert.match(renderer, /requestAnimationFrame\(frame\)/);
assert.match(renderer, /video\.currentTime = start/);
assert.match(renderer, /video\.ended/);

const action = getDirectorRenderTreatment({ storyRole: 'escalation' });
assert.equal(action.visualEnergy, 'impact');
assert.ok(action.motionBoost > 1);

const hero = getDirectorRenderTreatment({ storyRole: 'hero' });
assert.equal(hero.visualEnergy, 'resolve');
assert.ok(hero.speedEnd < hero.speedStart);

console.log('renderer-director-join: PASS');
