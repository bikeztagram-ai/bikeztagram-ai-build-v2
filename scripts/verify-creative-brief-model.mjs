import assert from 'node:assert/strict';
import { normalizeCreativeBrief } from '../src/creativeBriefModel.js';
const a=normalizeCreativeBrief('a dark cyberpunk robot chase through a neon city at night');
assert.equal(a.subject,'robot'); assert.equal(a.setting,'city'); assert.equal(a.mood,'dark'); assert.equal(a.style,'cyberpunk'); assert.ok(a.actions.includes('chase')); assert.equal(a.lighting,'neon');
const b=normalizeCreativeBrief('a romantic underwater fantasy with a creature flying through ruins');
assert.equal(b.subject,'creature'); assert.equal(b.setting,'underwater'); assert.equal(b.style,'fantasy'); assert.ok(b.actions.includes('fly'));
console.log('creative-brief-model: PASS');
