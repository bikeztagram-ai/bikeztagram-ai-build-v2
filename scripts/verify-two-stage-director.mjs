import assert from 'node:assert/strict';
import { editPlanToDirectorBlueprint } from '../src/twoStageDirector.js';

const analysis = {
  filename: '8518.mp4',
  durationInSeconds: 13,
  subject: { focalPoint: { x: 0.62, y: 0.47 } },
  bestMoments: [
    { start: 0, end: 3, score: 70 },
    { start: 4, end: 8, score: 90 },
    { start: 9, end: 13, score: 98 },
  ],
};

const plan = {
  title: 'Ninja Cinematic',
  colorGrade: 'dark-cinematic',
  editorialStructure: ['hook', 'reveal', 'hero'],
  cuts: [
    { momentIndex: 0, startTime: 0.2, endTime: 2, duration: 1.8, purpose: 'hook', transition: 'fade-in', motionStyle: 'slow-push', speed: 1 },
    { momentIndex: 1, startTime: 4.5, endTime: 6.8, duration: 2.3, purpose: 'reveal', transition: 'crossfade', motionStyle: 'pan-right', speed: 0.9 },
    { momentIndex: 2, startTime: 9.2, endTime: 12.5, duration: 3.3, purpose: 'hero', transition: 'dip-black', motionStyle: 'slow-pull', speed: 0.8, text: 'NINJA 1000SX' },
  ],
};

const blueprint = editPlanToDirectorBlueprint(plan, analysis, 'Make it cinematic', 15);
assert.equal(blueprint.directorSource, 'gemini-two-stage-edit-plan');
assert.equal(blueprint.mode, 'real-footage-first');
assert.equal(blueprint.scenes.length, 3);
assert.equal(blueprint.scenes[1].startTime, 4.5);
assert.equal(blueprint.scenes[1].endTime, 6.8);
assert.equal(blueprint.scenes[2].purpose, 'hero');
assert.equal(blueprint.scenes[2].motionStyle, 'slow-pull');
assert.equal(blueprint.scenes.every((scene) => scene.sourceType === 'uploaded'), true);
assert.equal(blueprint.scenes.every((scene) => scene.generationPrompt === ''), true);
assert.equal(blueprint.generationPolicy.generatedScenesAllowed, false);
assert.ok(blueprint.plannedDuration > 0);
assert.equal(blueprint.platformPlan.sourceOfTruth, 'same-verified-edit');
assert.equal(blueprint.platformPlan.preserveTimeline, true);
assert.equal(blueprint.platformPlan.platforms.length, 3);
assert.equal(blueprint.platformPlan.platforms[0].output.aspect, '9:16');
assert.equal(blueprint.reframeReadiness.readyForPlanning, true);
assert.equal(blueprint.reframeReadiness.readyForRendering, false);

console.log('two-stage-director: PASS');
