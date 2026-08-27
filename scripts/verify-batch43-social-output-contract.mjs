import assert from 'node:assert/strict';
import { SOCIAL_PRESETS, getSocialExportInfo } from '../src/socialExport.js';
import { resolveOutputPreset } from '../src/outputPresets.js';

assert.deepEqual(Object.keys(SOCIAL_PRESETS),['portrait','square','landscape']);
assert.equal(SOCIAL_PRESETS.portrait.width,1080);
assert.equal(SOCIAL_PRESETS.square.width,1080);
assert.equal(SOCIAL_PRESETS.landscape.width,1920);
const info=getSocialExportInfo(new Blob(['x'],{type:'video/webm'}),'landscape');
assert.equal(info.width,1920);assert.equal(info.height,1080);assert.equal(info.extension,'webm');

assert.equal(resolveOutputPreset(undefined,'vertical TikTok reel').id,'portrait');
assert.equal(resolveOutputPreset(undefined,'square Instagram feed post').id,'square');
assert.equal(resolveOutputPreset(undefined,'16x9 YouTube video').id,'landscape');
assert.equal(resolveOutputPreset('square','vertical TikTok reel').id,'square');

console.log('batch43-social-output-contract: PASS');
