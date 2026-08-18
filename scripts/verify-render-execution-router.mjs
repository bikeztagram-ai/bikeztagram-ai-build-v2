import assert from 'node:assert/strict';
import { routeRenderExecution } from '../src/renderExecutionRouter.js';

const videoOnly = routeRenderExecution({
  ready: true,
  targetDuration: 5,
  cuts: [
    { execution: { source: 'blob:v1', type: 'video', duration: 2 } },
    { execution: { source: 'blob:v2', type: 'video', duration: 3 } }
  ]
});
assert.equal(videoOnly.ready, true);
assert.equal(videoOnly.mode, 'stable-video');
assert.equal(videoOnly.fallbackAllowed, true);

const mixed = routeRenderExecution({
  ready: true,
  targetDuration: 5,
  cuts: [
    { execution: { source: 'blob:v1', type: 'video', duration: 2 } },
    { execution: { source: 'blob:i1', type: 'image', duration: 3 } }
  ]
});
assert.equal(mixed.ready, true);
assert.equal(mixed.mode, 'unified-media-pending');
assert.equal(mixed.fallbackAllowed, false);

const blocked = routeRenderExecution({
  ready: true,
  cuts: [{ execution: { source: 'blob:x', type: 'audio', duration: 2 } }]
});
assert.equal(blocked.ready, false);
assert.equal(blocked.mode, 'blocked');

console.log('render-execution-router: PASS');
