import assert from 'node:assert/strict';
import { OUTPUT_PRESETS, outputPlanFields, resolveOutputPreset } from '../src/outputPresets.js';

const cases = [
  ['make a vertical reel for TikTok', 'portrait'],
  ['Instagram Reels cinematic edit', 'portrait'],
  ['9x16 motorcycle short', 'portrait'],
  ['portrait story sequence', 'portrait'],
  ['square Instagram feed post', 'square'],
  ['1x1 product showcase', 'square'],
  ['16x9 YouTube video', 'landscape'],
  ['horizontal widescreen trailer', 'landscape'],
  ['cinematic landscape film', 'landscape'],
];

for (const [prompt, expected] of cases) {
  assert.equal(resolveOutputPreset(undefined, prompt).id, expected, prompt);
}

assert.equal(resolveOutputPreset('landscape', 'vertical TikTok reel').id, 'landscape', 'explicit preset wins');
assert.deepEqual(outputPlanFields(undefined, 'vertical TikTok reel'), {
  outputPreset: 'portrait',
  outputWidth: OUTPUT_PRESETS.portrait.width,
  outputHeight: OUTPUT_PRESETS.portrait.height,
  outputAspectRatio: '9:16'
});
assert.equal(resolveOutputPreset(undefined, '').id, 'portrait', 'safe default remains portrait');

console.log('output-preset-intent: PASS');
