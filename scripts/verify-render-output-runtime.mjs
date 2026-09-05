import {strict as assert} from 'node:assert';
import {OUTPUT_PRESETS} from '../src/outputPresets.js';
import {resolveRenderOutput,describeRenderOutput} from '../src/renderOutputRuntime.js';

for (const [id,preset] of Object.entries(OUTPUT_PRESETS)) {
  const resolved=resolveRenderOutput({outputPreset:id});
  assert.equal(resolved.preset.id,id);
  assert.equal(resolved.width,preset.width);
  assert.equal(resolved.height,preset.height);
  assert.equal(resolved.fps,preset.fps);
  assert.match(describeRenderOutput({outputPreset:id}),new RegExp(`${preset.width}×${preset.height}`));
}
assert.equal(resolveRenderOutput({creativePrompt:'make this a cinematic widescreen film'}).preset.id,'cinema');
assert.equal(resolveRenderOutput({creativePrompt:'make this horizontal for YouTube'}).preset.id,'landscape');
assert.equal(resolveRenderOutput({creativePrompt:'make this a square feed post'}).preset.id,'square');
assert.equal(resolveRenderOutput({creativePrompt:'make this an Instagram story'}).preset.id,'story');
assert.equal(resolveRenderOutput({}).preset.id,'portrait');
console.log('Render output runtime verification passed.');
