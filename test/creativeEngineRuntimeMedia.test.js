import assert from 'node:assert/strict';
import { runCreativeEngine } from '../src/creativeEngineRuntime.js';

const events = [];
const result = await runCreativeEngine({
  request: 'Create an original cinematic reveal from my footage.',
  targetDuration: 15,
  assets: [{ id: 'bike', name: 'ride.mp4', type: 'video/mp4', duration: 8, subjectId: 'bike-1' }],
  director: async (brief) => ({ ...brief, music: { bpm: 124, mood: 'dark cinematic', energy: 0.75 }, plan: { cuts: [{ generated: true, generationPrompt: 'Original night road reveal', duration: 3, mediaIndex: 0 }] } }),
  music: async ({ request }) => ({ kind: 'original-music', bpm: request.bpm || 124 }),
  scenes: async ({ requests }) => requests.map((request) => ({ id: request.id, generated: true, duration: request.duration })),
  assemble: async ({ music, scenes }) => ({ music, scenes, cuts: scenes.map((s) => ({ duration: s.duration })) }),
  render: async ({ timeline }) => ({ playable: true, timeline }),
  qa: async () => ({ score: 1 }),
  onStage: (name) => events.push(name),
});

assert.equal(result.status, 'complete');
assert.equal(result.outputs.music.kind, 'original-music');
assert.equal(result.outputs.scenes.length, 1);
assert.equal(result.outputs.render.playable, true);
assert.equal(result.outputs.qa.score, 1);
assert.equal(result.resume.stage, 'export');
console.log('creativeEngineRuntimeMedia: PASS');
