import assert from 'node:assert/strict';
import { createGenerationState, markGenerationStarted, markShotComplete, markGenerationFailed } from '../src/cinematicGenerationState.js';
import { buildCinematicTrailerManifest, validateCinematicTrailerManifest } from '../src/cinematicTrailerManifest.js';

const shots = [
  { id: 'shot-1', generationPrompt: 'wide motorcycle reveal', duration: 4, aspectRatio: '16:9' },
  { id: 'shot-2', generationPrompt: 'dynamic tracking shot', duration: 5, aspectRatio: '16:9' },
];
const manifest = buildCinematicTrailerManifest({ brief: 'night motorcycle trailer', shots });
const validation = validateCinematicTrailerManifest(manifest);
assert.equal(validation.ok, true);
assert.equal(validation.shotCount, 2);
assert.equal(manifest.zeroCostOnly, true);

let state = createGenerationState(shots);
assert.equal(state.status, 'idle');
state = markGenerationStarted(state, 'shot-1');
assert.equal(state.status, 'generating');
state = markShotComplete(state, { id: 'shot-1' });
assert.equal(state.completed, 1);
assert.equal(state.progress, 50);
state = markShotComplete(state, { id: 'shot-2' });
assert.equal(state.status, 'complete');
assert.equal(state.progress, 100);

const failed = markGenerationFailed(createGenerationState(shots), new Error('worker unavailable'), 'shot-1');
assert.equal(failed.status, 'error');
assert.equal(failed.currentShot, 'shot-1');
assert.match(failed.error, /worker unavailable/);

console.log('cinematic-pipeline: PASS');
