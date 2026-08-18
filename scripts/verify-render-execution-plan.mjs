import assert from 'node:assert/strict';
import { buildRenderExecutionPlan } from '../src/renderExecutionPlan.js';

const result = buildRenderExecutionPlan({
  targetDuration: 6,
  mediaItems: [{ id: 'bike-a', url: 'blob:a', type: 'video' }, { id: 'bike-b', url: 'blob:b', type: 'video' }],
  cuts: [
    { mediaIndex: 0, startTime: 1, duration: 3, storyRole: 'hook' },
    { mediaIndex: 1, startTime: 4, duration: 3, storyRole: 'hero' }
  ]
});
assert.equal(result.ready, true);
assert.equal(result.cuts[0].renderIndex, 0);
assert.equal(result.cuts[0].execution.source, 'blob:a');
assert.equal(result.cuts[1].execution.type, 'video');
assert.equal(result.cuts[1].execution.generated, false);

const mixed = buildRenderExecutionPlan({
  targetDuration: 4,
  mediaItems: [{ id: 'bike', url: 'blob:bike', type: 'video' }],
  cuts: [
    { mediaIndex: 0, startTime: 0, duration: 2 },
    { sourceType: 'generated', generated: true, generationStatus: 'ready', generatedMediaType: 'image', assetUrl: 'blob:image', duration: 2 }
  ]
});
assert.equal(mixed.ready, true);
assert.equal(mixed.cuts[1].execution.type, 'image');
assert.equal(mixed.cuts[1].execution.generated, true);

console.log('render-execution-plan: PASS');
