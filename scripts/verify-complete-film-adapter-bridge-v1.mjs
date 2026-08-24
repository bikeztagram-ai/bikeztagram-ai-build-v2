import assert from 'node:assert/strict';
import { createCompleteFilmAdapterBridge, createCompleteFilmJobInput } from '../src/completeFilmAdapterBridgeV1.js';

const calls = [];
const bridge = createCompleteFilmAdapterBridge({
  understand: async (input) => { calls.push('understand'); return { media: input.media, ok: true }; },
  direct: async () => { calls.push('direct'); return { plan: ['hook', 'reveal'] }; },
  music: async () => { calls.push('music'); return { soundtrack: 'original' }; },
  scenes: async () => { calls.push('scenes'); return { scenes: ['hero'] }; },
  assemble: async (input) => { calls.push('assemble'); return { soundtrack: input.originalSoundtrackRequired }; },
  render: async () => { calls.push('render'); return { url: 'blob:rendered' }; },
  qa: async () => { calls.push('qa'); return { score: 96 }; },
  revise: async () => { calls.push('revise'); return { skipped: true }; },
  exportFilm: async () => { calls.push('export'); return { ready: true }; },
});

const job = createCompleteFilmJobInput({
  media: [{ name: 'bike.mp4', mimeType: 'video/mp4', url: 'blob:bike' }],
  prompt: 'Create an original cinematic motorcycle trailer',
});

assert.equal(job.version, 'complete-film-job-input-v1');
assert.equal(job.policy, 'original-content-only');
assert.equal(job.originalSoundtrackRequired, true);
assert.equal(job.media[0].id, 'bike.mp4');

const understood = await bridge.understand({ context: job });
const directed = await bridge.direct({ context: { ...job, understand: understood } });
const [music, scenes] = await Promise.all([
  bridge.music({ context: { ...job, understand: understood, direct: directed } }),
  bridge.scenes({ context: { ...job, understand: understood, direct: directed } }),
]);
const assembled = await bridge.assemble({ context: { ...job, understand: understood, direct: directed, music, scenes } });
const rendered = await bridge.render({ context: { ...job, assemble: assembled } });
const qa = await bridge.qa({ context: { ...job, render: rendered } });
const exported = await bridge.export({ context: { ...job, render: rendered, qa } });

assert.equal(understood.ok, true);
assert.equal(directed.plan.length, 2);
assert.equal(music.soundtrack, 'original');
assert.equal(scenes.scenes[0], 'hero');
assert.equal(assembled.soundtrack, true);
assert.equal(rendered.url, 'blob:rendered');
assert.equal(qa.score, 96);
assert.equal(exported.ready, true);
assert.deepEqual(calls, ['understand', 'direct', 'music', 'scenes', 'assemble', 'render', 'qa', 'export']);

const fallback = createCompleteFilmAdapterBridge();
const fallbackAssembly = await fallback.assemble({ context: { music: { soundtrack: 'original' }, scenes: [] } });
assert.equal(fallbackAssembly.originalSoundtrackRequired, true);
assert.equal(fallbackAssembly.policy, 'original-content-only');

console.log('Complete Film Adapter Bridge V1 verification passed.');
