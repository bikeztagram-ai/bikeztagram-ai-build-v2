import assert from 'node:assert/strict';
import { createCompleteFilmRuntime, runCompleteFilm, getCompleteFilmProgress } from '../src/completeFilmRuntimeV1.js';
import { planMissingShots, mergeGeneratedFillResults, validateFillPlan } from '../src/aiFillPlannerV1.js';

const events = [];
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
  qa: async () => ({ score: 100 }),
  export: async ({ context }) => ({ rendered: context.render.rendered, soundtrackRetained: context.render.soundtrackRetained }),
};

const state = createCompleteFilmRuntime({ job: { id: 'verify-complete-film' }, adapters });
const started = Date.now();
const result = await runCompleteFilm(state);
const elapsed = Date.now() - started;

assert.equal(result.stage, 'complete');
assert.equal(result.outputs.music.soundtrack, 'original');
assert.equal(result.outputs.assemble.soundtrackRetained, true);
assert.equal(result.outputs.scenes.fill.length, 1);
assert.ok(elapsed < 75, `music/scenes should run in parallel; elapsed=${elapsed}ms`);
assert.deepEqual(events.sort(), ['music', 'scenes']);

const merged = mergeGeneratedFillResults(result.outputs.scenes.plan, [{ sceneIndex: 2, id: 'generated-s3', request: { prompt: 'hero fill' } }]);
assert.equal(merged.find((scene) => scene.id === 's3').generated, true);
assert.equal(getCompleteFilmProgress(result).percent, 100);

console.log('PASS: complete-film runtime parallel creative branches + canonical AI fill + original soundtrack retention');
