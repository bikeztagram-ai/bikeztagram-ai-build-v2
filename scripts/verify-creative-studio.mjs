import assert from 'node:assert/strict';
import { createCreativeStudioProject, prepareCreativeExecution, reviseCreativeProject } from '../src/creativeStudioFacade.js';

const project = createCreativeStudioProject({ subjectType: 'travel', goal: 'launch', duration: 30, assets: [{ id: 'a1' }] });
assert.equal(project.intent.subjectType, 'travel');
assert.ok(project.story);

const executable = { ...project, editPlan: { tracks: { video: [{ id: 'shot-1', start: 0, duration: 3 }] } }, output: { width: 1080, height: 1920, fps: 30 } };
const prepared = prepareCreativeExecution(executable, [{ id: 'm1', score: .9, hook: 'strong', sourceMomentId: 'a1' }], { outputs: ['hero', 'reel'] });
assert.ok(prepared.execution);
assert.equal(prepared.renderValidation.valid, true);
assert.equal(prepared.campaign.length, 2);
assert.ok(prepared.run.stages.length > 0);

const revision = reviseCreativeProject(executable, 'make it darker and faster');
assert.ok(revision.regeneration.stages.includes('look'));
assert.ok(revision.regeneration.stages.includes('edit'));

console.log('creative-studio: PASS');
