import assert from 'node:assert/strict';
import { normalizeCreativeBrief, briefToGenerationDirectives } from '../src/creativeBriefModel.js';

const cases = [
  ['A neon cyberpunk robot races through a rainy city at night', ['robot','city','neon','cyberpunk','race']],
  ['A watercolor fantasy creature flies above a mountain at sunrise', ['creature','mountain','sunrise','watercolor','fly']],
  ['A product commercial for a watch with macro close-ups and studio lighting', ['product','watch','macro','studio','commercial']],
  ['A horror film: a person escapes through a forest in candlelight', ['person','forest','candlelight','horror','escape']],
];
for (const [prompt, expected] of cases) {
  const brief = normalizeCreativeBrief(prompt, { aspectRatio: '16:9' });
  const directives = briefToGenerationDirectives(brief);
  for (const token of expected) {
    const values = [brief.subject, brief.setting, brief.mood, brief.camera, brief.lighting, brief.style, ...brief.actions];
    assert(values.includes(token), `${token} was not inferred from: ${prompt}`);
  }
  assert.equal(directives.aspectRatio, '16:9');
  assert.equal(directives.subject, brief.subject);
}
console.log('Universal creative brief v4: PASS');
