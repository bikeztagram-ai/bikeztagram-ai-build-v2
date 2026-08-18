import assert from 'node:assert/strict';
import { renderProject } from '../src/renderProjectGuard.js';

await assert.rejects(
  () => renderProject([], { cuts: [{ startTime: 0, duration: 2 }], targetDuration: 15, sourceDuration: 20 }),
  /materially short/,
);

await assert.rejects(
  () => renderProject([], { cuts: [], targetDuration: 15, sourceDuration: 20 }),
  /contains no cuts/,
);

console.log('render-project-guard: PASS');
