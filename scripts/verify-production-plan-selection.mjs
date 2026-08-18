import assert from 'node:assert/strict';
import handler from '../api/production-plan.js';

function callProductionPlan(analysis, targetDuration = 15) {
  return new Promise((resolve, reject) => {
    const req = { method: 'POST', body: { prompt: 'Create a cinematic motorcycle social video.', analysis, targetDuration } };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ statusCode: this.statusCode, payload }); return this; }
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

const analysis = {
  filename: 'test.mp4',
  durationInSeconds: 15,
  subject: { description: 'a blue motorcycle', motorcycleModel: 'motorcycle', motorcycleVisible: true },
  bestMoments: [
    { start: 0.2, end: 2.8, score: 98, description: 'opening road shot' },
    { start: 2.9, end: 5.5, score: 96, description: 'riding movement' },
    { start: 5.8, end: 8.2, score: 94, description: 'cornering action' },
    { start: 8.7, end: 11.2, score: 92, description: 'speed shot' },
    { start: 11.5, end: 14.4, score: 90, description: 'hero motorcycle ending' }
  ]
};

const result = await callProductionPlan(analysis);
assert.equal(result.statusCode, 200);
assert.equal(result.payload.success, true);

const scenes = result.payload.productionPlan.scenes;
assert.equal(scenes.length, 6, '15-second source should produce six real-footage scenes');
assert.ok(scenes.every((scene) => scene.sourceType === 'uploaded'));
assert.ok(scenes.every((scene) => scene.duration >= 0.8));

for (let i = 1; i < scenes.length; i += 1) {
  assert.ok(scenes[i].startTime > scenes[i - 1].startTime, 'scene anchors must move forward through the source');
  assert.ok(scenes[i].startTime - scenes[i - 1].startTime >= 1.2, 'scene anchors must maintain temporal diversity');
}

const total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
assert.ok(total >= 12, `real-footage master should remain close to target duration, got ${total}s`);
assert.equal(result.payload.productionPlan.generationPolicy.useGeneratedFill, false);

console.log('production-plan-selection: PASS');
