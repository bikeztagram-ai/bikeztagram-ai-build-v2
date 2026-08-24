import assert from 'node:assert/strict';
import { createCompleteFilmRuntime, runCompleteFilm, getCompleteFilmProgress } from '../src/completeFilmRuntimeV1.js';
import { planMissingShots, mergeGeneratedFillResults, validateFillPlan } from '../src/aiFillPlannerV1.js';

const events = [];
let qaRuns = 0;
let revisionRuns = 0;
const adapters = {
  understand: async () => ({ media: 'understood' }),
  direct: async () => ({ scenes: [{ id: 's1', mediaId: 'm1' }, { id: 's2', mediaId: 'm2' }, { id: 's3', requiredShot: 'hero fill', duration: 2 }], requiredShots: [] }),
  music: async () => { await new Promise((r) => setTimeout(r, 40)); events.push('music'); return { soundtrack: 'original', retained: true }; },
  scenes: async ({ context }) => {
    await new Promise((r) => setTimeout(r, 40));
    events.push('scenes');
    const fill = planMissingShots(context.direct.scenes, { aspectRatio: '9:16', subjectIds: ['primary-subject'] });
    assert.equal(validateFillPlan(fill).pass, true);
    return { plan: context.direct.scenes, fill, generated: fill };
  },
  assemble: async ({ context }) => ({ timeline: context.scenes.plan, generated: context.scenes.generated, soundtrack: context.music.soundtrack, soundtrackRetained: context.music.retained }),
  render: async ({ context }) => ({ ...context.assemble, rendered: true }),
  qa: async () => { qaRuns += 1; return { score: qaRuns === 1 ? 70 : 100 }; },
  revise: async ({ context }) => { revisionRuns += 1; return { render: { ...context.render, revised: true }, reason: context.qa.score < 80 ? 'creative QA requested revision' : 'none' }; },
  export: async ({ context }) => ({ rendered: context.render.rendered, revised: context.render.revised, soundtrackRetained: context.render.soundtrackRetained }),
};

const state = createCompleteFilmRuntime({ job: { id: 'verify-complete-film' }, adapters, maxAttempts: 3 });
const started = Date.now();
const result = await runCompleteFilm(state);
const elapsed = Date.now() - started;

assert.equal(result.stage, 'complete');
assert.equal(result.outputs.music.soundtrack, 'original');
assert.equal(result.outputs.assemble.soundtrackRetained, true);
assert.equal(result.outputs.scenes.fill.length, 1);
assert.ok(elapsed < 75, `music/scenes should run in parallel; elapsed=${elapsed}ms`);
assert.deepEqual(events.sort(), ['music', 'scenes']);
assert.equal(qaRuns, 2, 'QA must run again after a creative revision');
assert.equal(revisionRuns, 1, 'one failed QA should trigger one revision');
assert.equal(result.outputs.qa.score, 100, 'final export must use the post-revision QA result');
assert.equal(result.outputs.export.revised, true);

const merged = mergeGeneratedFillResults(result.outputs.scenes.plan, [{ sceneIndex: 2, id: 'generated-s3', request: { prompt: 'hero fill' } }]);
assert.equal(merged.find((scene) => scene.id === 's3').generated, true);
assert.equal(getCompleteFilmProgress(result).percent, 100);

console.log('PASS: complete-film runtime parallel creative branches + canonical AI fill + original soundtrack retention + QA revision/recheck loop');
