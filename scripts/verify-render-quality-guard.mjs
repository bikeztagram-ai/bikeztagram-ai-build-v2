import assert from 'node:assert/strict';
import { validateRenderReadiness } from '../src/renderQualityGuard.js';

const mediaItems = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const good = validateRenderReadiness({
  mediaItems,
  plan: {
    targetDuration: 15,
    cuts: [
      { mediaIndex: 0, startTime: 0, duration: 3 },
      { mediaIndex: 1, startTime: 2, duration: 3 },
      { mediaIndex: 2, startTime: 5, duration: 3 },
      { mediaIndex: 1, startTime: 8, duration: 3 },
      { mediaIndex: 0, startTime: 10, duration: 3 }
    ]
  }
});
assert.equal(good.ready, true);
assert.equal(good.totalDuration, 15);

const bad = validateRenderReadiness({
  mediaItems,
  plan: {
    targetDuration: 15,
    cuts: [
      { mediaIndex: 0, startTime: -1, duration: 2 },
      { mediaIndex: 99, startTime: 2, duration: 8 }
    ]
  }
});
assert.equal(bad.ready, false);
assert.ok(bad.issues.some((issue) => /missing media/i.test(issue)));
assert.ok(bad.issues.some((issue) => /invalid source time/i.test(issue)));
assert.ok(bad.issues.some((issue) => /duration/i.test(issue)));

console.log('render-quality-guard: PASS');
