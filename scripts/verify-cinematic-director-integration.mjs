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
    { momentIndex: 0, startTime: 0, endTime: 2, duration: 2 },
    { momentIndex: 1, startTime: 4, endTime: 6, duration: 2 },
    { momentIndex: 2, startTime: 8, endTime: 10, duration: 2 },
    { momentIndex: 3, startTime: 12, endTime: 14, duration: 2 },
  ],
};

const blueprint = editPlanToDirectorBlueprint(plan, analysis, 'Make this a cinematic motorcycle reel.', 15);
assert.equal(blueprint.scenes.length, 4);
assert.equal(blueprint.scenes.at(-1).priority, 'hero');
assert.equal(blueprint.scenes.at(-1).startTime, 4);
assert.ok(blueprint.scenes.some((scene) => scene.motionStyle === 'pan-left'));
assert.ok(blueprint.scenes.some((scene) => scene.motionStyle === 'pan-right'));
assert.equal(blueprint.mode, 'real-footage-first');
assert.equal(blueprint.generationPolicy.generatedScenesAllowed, false);
assert.ok(blueprint.directorNotes.some((note) => note.includes('Editorial structure')));

console.log('cinematic-director-integration: PASS');
