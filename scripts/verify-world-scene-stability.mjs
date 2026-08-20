import assert from 'node:assert/strict';
import { normaliseWorldSceneDuration, worldSceneFrameState, worldSceneMotionAmplitude, isWorldSceneSourceReady } from '../src/worldSceneStability.js';

assert.equal(normaliseWorldSceneDuration(8), 8);
assert.equal(normaliseWorldSceneDuration(0), 8);
assert.equal(normaliseWorldSceneDuration('bad'), 8);
assert.equal(normaliseWorldSceneDuration(999), 30);
assert.equal(normaliseWorldSceneDuration(.1), .75);

const start = worldSceneFrameState(0, 8);
assert.equal(start.progress, 0);
assert.equal(start.shot, 0);
assert.equal(start.complete, false);

const middle = worldSceneFrameState(4000, 8);
assert.ok(middle.progress > .49 && middle.progress < .51);
assert.equal(middle.shot, 1);
assert.ok(middle.localProgress > 0);

const end = worldSceneFrameState(8000, 8);
assert.equal(end.progress, 1);
assert.equal(end.complete, true);
assert.equal(end.shot, 2);

assert.ok(worldSceneMotionAmplitude(1) < .5, 'action shake must remain restrained');
assert.ok(worldSceneMotionAmplitude(2) < worldSceneMotionAmplitude(1), 'hero shot should be steadier than action shot');
assert.equal(worldSceneMotionAmplitude(1, 0), 0);

assert.equal(isWorldSceneSourceReady({readyState:2,duration:8,videoWidth:1920,videoHeight:1080}), true);
assert.equal(isWorldSceneSourceReady({readyState:1,duration:8,videoWidth:1920,videoHeight:1080}), false);
assert.equal(isWorldSceneSourceReady({readyState:2,duration:0,videoWidth:1920,videoHeight:1080}), false);
assert.equal(isWorldSceneSourceReady({readyState:2,duration:8,videoWidth:0,videoHeight:1080}), false);

console.log('world-scene-stability: PASS');
