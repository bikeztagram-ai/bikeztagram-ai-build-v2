import assert from 'node:assert/strict';
import { buildMultiPlatformPlan, buildPlatformFraming } from '../src/platformReframe.js';
import { editPlanToDirectorBlueprint } from '../src/twoStageDirector.js';

const analysis = {
  filename: '8518.mp4',
  durationInSeconds: 20,
  subject: { description: 'blue Kawasaki motorcycle', focalPoint: { x: 0.62, y: 0.48 } },
  bestMoments: [
    { start: 2, end: 5, score: 0.95 },
    { start: 9, end: 12, score: 0.91 }
  ]
};

const plan = {
  title: 'Ninja cinematic reel',
  colorGrade: 'dark-cinematic',
  editorialStructure: ['hook', 'action', 'hero'],
  cuts: [
    { startTime: 2.2, endTime: 3.7, duration: 1.5, purpose: 'hook', transition: 'fade-in', motionStyle: 'slow-push', motionIntensity: 0.7, speed: 1 },
    { startTime: 9.2, endTime: 11.7, duration: 2.5, purpose: 'hero', transition: 'hard-cut', motionStyle: 'slow-push', motionIntensity: 0.7, speed: 0.85 }
  ]
};

const reframed = buildMultiPlatformPlan(analysis);
assert.equal(reframed.preserveTimeline, true);
assert.equal(reframed.preserveSourceTimestamps, true);
assert.equal(reframed.platforms.length, 5);
assert.deepEqual(reframed.platforms.map((p) => p.output.aspect), ['9:16', '9:16', '9:16', '16:9', '1:1']);
assert.equal(reframed.platforms.every((p) => p.safeArea.keepSubjectVisible), true);
assert.equal(reframed.platforms.every((p) => p.crop.focalPoint.x === 0.62), true);

const youtube = buildPlatformFraming(analysis, 'youtube');
assert.equal(youtube.output.aspect, '16:9');
assert.ok(youtube.crop.x >= 0 && youtube.crop.x + youtube.crop.width <= 1);
assert.ok(youtube.crop.y >= 0 && youtube.crop.y + youtube.crop.height <= 1);

const blueprint = editPlanToDirectorBlueprint(plan, analysis, 'Make a cinematic motorcycle social edit', 15);
assert.equal(blueprint.mode, 'real-footage-first');
assert.equal(blueprint.platformReframe.platforms.length, 5);
assert.equal(blueprint.scenes[0].startTime, 2.2);
assert.equal(blueprint.scenes[1].startTime, 9.2);
assert.equal(blueprint.platformReframe.preserveEditorialOrder, true);

console.log('Platform reframing verification passed.');
