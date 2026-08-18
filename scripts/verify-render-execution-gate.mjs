import assert from 'node:assert/strict';
import { prepareRenderExecution } from '../src/renderExecutionGate.js';

const ready = prepareRenderExecution({
  targetDuration: 6,
  ready: true,
  cuts: [
    { renderIndex: 0, storyRole: 'hook', storyOrder: 1, sourceResolution: { type: 'video', generated: false }, execution: { source: 'blob:v', type: 'video', generated: false, startTime: 0, duration: 3 } },
    { renderIndex: 1, storyRole: 'hero', storyOrder: 2, sourceResolution: { type: 'image', generated: true }, execution: { source: 'blob:i', type: 'image', generated: true, startTime: 0, duration: 3 } }
  ]
}, { ready: true });
assert.equal(ready.ready, true);
assert.equal(ready.cuts.length, 2);
assert.equal(ready.cuts[1].generated, true);
assert.equal(ready.cuts[0].storyRole, 'hook');

const blocked = prepareRenderExecution({ ready: false, cuts: [] }, { ready: true });
assert.equal(blocked.ready, false);

const blockedQuality = prepareRenderExecution({ ready: true, cuts: [{ execution: { source: 'x' }, sourceResolution: { type: 'video' } }] }, { ready: false, issues: ['bad duration'] });
assert.equal(blockedQuality.ready, false);
assert.match(blockedQuality.reason, /readiness/i);

console.log('render-execution-gate: PASS');
