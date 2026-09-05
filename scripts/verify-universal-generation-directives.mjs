import assert from 'node:assert/strict';
import { normalizeCreativeBrief, briefToGenerationDirectives } from '../src/creativeBriefModel.js';
const brief=normalizeCreativeBrief('epic sci-fi spaceship race on Mars with neon lighting, aerial camera, fast action');
const d=briefToGenerationDirectives(brief);
assert.equal(d.subject,'spaceship'); assert.equal(d.environment,'mars'); assert.equal(d.style,'sci-fi'); assert.equal(d.camera,'aerial'); assert.ok(d.actions.includes('race')); assert.equal(d.lighting,'neon');
assert.equal(d.aspectRatio,'portrait');
console.log('universal-generation-directives: PASS');
