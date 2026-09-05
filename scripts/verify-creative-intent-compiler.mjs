import assert from 'node:assert/strict';
import { compileCreativeIntent, mergeCreativeIntent } from '../src/creativeIntentCompiler.js';

const intent = compileCreativeIntent('dark cyberpunk motorcycle chase at night with neon rain, fast FPV camera and an epic reveal', { duration: 15, aspectRatio: '9:16' });
assert.equal(intent.world, 'cyberpunk');
assert.equal(intent.subject, 'motorcycle');
assert.equal(intent.camera, 'first-person');
assert.equal(intent.lighting, 'night');
assert.equal(intent.pace, 'rapid');
assert.ok(intent.visualEffects.includes('rain'));
assert.equal(intent.constraints.noGemini, true);
assert.equal(intent.constraints.avoidCopyrightImitation, true);
assert.ok(Array.isArray(intent.capabilityHints) && intent.capabilityHints.length >= 3);
const merged = mergeCreativeIntent({ cuts: [{ mediaIndex: 0 }] }, intent);
assert.equal(merged.creativeIntent, intent);
assert.equal(merged.creativeDirection.world, 'cyberpunk');
console.log('creative-intent-compiler: PASS');
