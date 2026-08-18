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

const generatedGood = validateRenderReadiness({
  mediaItems: [],
  plan: {
    targetDuration: 6,
    cuts: [
      { sourceType: 'generated', generationStatus: 'ready', assetUrl: 'blob:image', startTime: 0, duration: 3 },
      { sourceType: 'generated', generationStatus: 'ready', assetUrl: 'blob:video', startTime: 0, duration: 3 }
    ]
  }
});
assert.equal(generatedGood.ready, true);

const generatedBad = validateRenderReadiness({
  mediaItems: [],
  plan: {
    targetDuration: 3,
    cuts: [
      { sourceType: 'generated', generationStatus: 'planned', startTime: 0, duration: 3 }
    ]
  }
});
assert.equal(generatedBad.ready, false);
assert.ok(generatedBad.issues.some((issue) => /generated asset/i.test(issue)));

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
