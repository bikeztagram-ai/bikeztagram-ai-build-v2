import fs from 'node:fs';
import assert from 'node:assert/strict';

const enhancer=fs.readFileSync(new URL('../src/aiVideoEnhancer.js',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('../src/cinematicRendererV3.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../src/universalRenderRuntime.js',import.meta.url),'utf8');
assert.match(enhancer,/generationCutIndex/);
assert.match(enhancer,/generatedMediaId/);
assert.match(enhancer,/ratioForPreset/);
assert.match(enhancer,/Math\.min\(10/);
assert.doesNotMatch(enhancer,/Preserve the motorcycle, rider/);
assert.match(renderer,/mediaForCut/);
assert.match(renderer,/generated visuals must contain a real video source/);
assert.match(runtime,/outputPreset/);
assert.match(runtime,/generationContract/);
console.log('universal-ai-video-contract: PASS');
