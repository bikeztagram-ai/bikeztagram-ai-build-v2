import assert from 'node:assert/strict';
import { buildMultiPlatformPlan } from '../src/platformReframe.js';
import { buildReframeReadiness, validatePlatformReframePlan } from '../src/platformReframeQuality.js';

const analysis = {
  subject: { focalPoint: { x: 0.63, y: 0.48 } },
  bestMoments: [{ start: 2, end: 5, score: 0.94 }],
};

const plan = buildMultiPlatformPlan(analysis, ['reels', 'tiktok', 'shorts', 'youtube', 'square']);
assert.equal(plan.sourceOfTruth, 'same-verified-edit');
assert.equal(plan.preserveTimeline, true);
assert.equal(plan.preserveSourceTimestamps, true);
assert.equal(plan.platforms.length, 5);
assert.deepEqual(plan.platforms.map((item) => item.platform), ['reels', 'tiktok', 'shorts', 'youtube', 'square']);
assert.equal(plan.platforms[0].output.aspect, '9:16');
assert.equal(plan.platforms[3].output.aspect, '16:9');
assert.equal(plan.platforms[4].output.aspect, '1:1');
for (const item of plan.platforms) {
  assert.ok(item.crop.x >= 0 && item.crop.y >= 0);
  assert.ok(item.crop.x + item.crop.width <= 1.001);
  assert.ok(item.crop.y + item.crop.height <= 1.001);
  assert.deepEqual(item.crop.focalPoint, { x: 0.63, y: 0.48 });
}

const validation = validatePlatformReframePlan(plan, analysis);
assert.equal(validation.valid, true);
assert.equal(validation.platformCount, 5);
assert.equal(buildReframeReadiness(plan, analysis).readyForPlanning, true);
assert.equal(buildReframeReadiness(plan, analysis).readyForRendering, false);

const broken = { ...plan, preserveTimeline: false, platforms: [{ ...plan.platforms[0], crop: { x: 0.9, y: 0, width: 0.5, height: 0.9 } }] };
assert.equal(validatePlatformReframePlan(broken, analysis).valid, false);

console.log('platform-reframe: PASS');
