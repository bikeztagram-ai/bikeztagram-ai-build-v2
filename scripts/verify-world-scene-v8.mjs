import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=fs.readFileSync(path.join(root,'src/worldScene.js'),'utf8');
assert.match(file,/export async function renderWorldScene/);
assert.match(file,/durationMs=Math\.max/);
assert.match(file,/requestAnimationFrame\(frame\)/);
assert.match(file,/Math\.floor\(elapsed\*30\)/);
assert.doesNotMatch(file,/Math\.sin\(t\*115\)/,'high-frequency camera shake must stay removed');
assert.doesNotMatch(file,/Math\.sin\(t\*38\)/,'high-frequency camera shake must stay removed');
assert.match(file,/video\.playbackRate=1/);
assert.match(file,/recorder\.start\(500\)/);
assert.match(file,/recorder\.stop\(\)/);
assert.match(file,/MediaRecorder/);
assert.match(file,/ImageSegmenter/);
console.log('world-scene-v8-static-verification: PASS');
