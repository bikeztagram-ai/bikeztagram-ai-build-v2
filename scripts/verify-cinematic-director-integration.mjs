import assert from 'node:assert/strict';
import { editPlanToDirectorBlueprint } from '../src/twoStageDirector.js';

const analysis = {
  filename: 'bike.mp4',
  durationInSeconds: 20,
  bestMoments: [
    { score: 60, cinematicScore: 55, actionScore: 40, shotType: 'wide', cameraMovement: 'static' },
    { score: 95, cinematicScore: 92, actionScore: 90, shotType: 'tracking', cameraMovement: 'right' },
    { score: 75, cinematicScore: 70, actionScore: 65, shotType: 'close', cameraMovement: 'push' },
    { score: 88, cinematicScore: 84, actionScore: 82, shotType: 'front', cameraMovement: 'left' },
  ],
};

const plan = {
  title: 'Test Ride',
  cuts: [
    { momentIndex: 0, startTime: 0, endTime: 4, duration: 4 },
    { momentIndex: 1, startTime: 4, endTime: 8, duration: 4 },
    { momentIndex: 2, startTime: 8, endTime: 12, duration: 4 },
    { momentIndex: 3, startTime: 12, endTime: 15, duration: 3 },
  ],
};

const blueprint = editPlanToDirectorBlueprint(plan, analysis, 'Make this a cinematic motorcycle reel.', 15);
assert.equal(blueprint.scenes.length, 4);
assert.equal(blueprint.scenes.at(-1).priority, 'hero');
assert.equal(blueprint.scenes.at(-1).startTime, 12);
assert.ok(blueprint.scenes.some((scene) => scene.motionStyle === 'pan-left'));
assert.ok(blueprint.scenes.some((scene) => scene.motionStyle === 'pan-right'));
assert.equal(blueprint.mode, 'real-footage-first');
assert.equal(blueprint.generationPolicy.generatedScenesAllowed, false);
assert.ok(blueprint.directorNotes.some((note) => note.includes('Editorial structure')));
assert.equal(blueprint.executionReadiness.ready, true);
assert.equal(blueprint.executionReadiness.sourceDuration, 20);
assert.equal(blueprint.executionReadiness.effectiveDurationAccountsForSpeed, true);

const blocked = editPlanToDirectorBlueprint(
  { title: 'Too Short', cuts: [{ startTime: 0, endTime: 2, duration: 2 }] },
  analysis,
  'Make this a cinematic motorcycle reel.',
  15,
);
assert.equal(blocked.executionReadiness.ready, false);
assert.ok(blocked.executionReadiness.errors.some((item) => item.includes('materially short')));

console.log('cinematic-director-integration: PASS');
