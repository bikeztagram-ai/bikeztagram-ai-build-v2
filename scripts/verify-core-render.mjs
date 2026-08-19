import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMultiPlatformPlan } from '../src/platformReframe.js';
import { allTimelineSourcesReady } from '../src/mediaSourceResolver.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function assertLocalImports(relative) {
  const source = read(relative);
  const importer = path.dirname(path.join(root, relative));
  const matches = source.matchAll(/(?:from\s*|import\s*\()(['"])(\.\.?\/[^'"]+)\1/g);
  for (const match of matches) {
    let target = path.resolve(importer, match[2]);
    if (!path.extname(target)) target += '.js';
    assert.ok(fs.existsSync(target), `${relative} imports missing local module ${match[2]}`);
  }
}

for (const file of ['src/App.jsx', 'src/renderer.js', 'src/director.js', 'src/aiEditPlanner.js', 'src/twoStageDirector.js', 'src/platformReframe.js', 'src/mediaSourceResolver.js']) {
  assertLocalImports(file);
}

const renderer = read('src/renderer.js');
assert.match(renderer, /canvas\.captureStream\(30\)/, 'Renderer must capture canvas video.');
assert.match(renderer, /createMediaStreamDestination\(\)/, 'Renderer must support captured audio.');
assert.match(renderer, /new MediaStream\(\[/, 'Renderer must combine video and audio tracks.');
assert.match(renderer, /createMediaElementSource\(element\)/, 'Renderer must route source video audio into the render stream.');
assert.match(renderer, /MediaRecorder/, 'Renderer must record the composed stream.');
assert.match(renderer, /Public Blob source failed; retrying local File source/, 'Renderer must retain the local-file fallback.');
assert.match(renderer, /URL\.revokeObjectURL\(source\.url\)/, 'Renderer must release temporary source URLs.');
assert.match(renderer, /recorder\.onstop/, 'Renderer must resolve the final recording on recorder stop.');

const platform = buildMultiPlatformPlan({ subject: { focalPoint: { x: 0.62, y: 0.48 } } });
assert.equal(platform.platforms.length, 5);
assert.equal(platform.preserveTimeline, true);
assert.equal(platform.preserveSourceTimestamps, true);
assert.equal(platform.platforms.every((item) => item.safeArea.keepSubjectVisible), true);
assert.equal(platform.platforms.every((item) => item.crop.focalPoint.x === 0.62), true);

const media = [{ sourceUrl: 'blob:source', type: 'video/mp4' }];
const ready = allTimelineSourcesReady([{ sourceType: 'uploaded', mediaIndex: 0 }], media);
assert.equal(ready.ready, true);
const missing = allTimelineSourcesReady([{ sourceType: 'uploaded', mediaIndex: 9 }], media);
assert.equal(missing.ready, false);

assert.equal(fs.existsSync(path.join(root, '.github/workflows/autonomous-control.yml')), false, 'Autonomous control workflow must not be part of the controlled deployment batch.');

console.log('core-render-static-verification: PASS');
