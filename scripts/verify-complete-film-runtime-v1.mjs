import assert from 'node:assert/strict';
import { createCompleteFilmRuntime, runCompleteFilm, getCompleteFilmProgress } from '../src/completeFilmRuntimeV1.js';
import { planAiFill, mergeGeneratedShots } from '../src/aiFillPlannerV1.js';

const events = [];
const adapters = {
  understand: async () => ({ media: 'understood' }),
  direct: async () => ({ scenes: [{ id: 's1' }, { id: 's2' }], requiredShots: [{ id: 's1' }, { id: 's2' }, { id: 's3', role: 'hero-fill' }] }),
  music: async () => { await new Promise((r) => setTimeout(r, 40)); events.push('music'); return { soundtrack: 'original', retained: true }; },
  scenes: async ({ context }) => { await new Promise((r) => setTimeout(r, 40)); events.push('scenes'); const fill = planAiFill({ requiredShots: context.direct.requiredShots, availableShots: context.direct.scenes, continuity: { subjectIdentity: 'primary-subject' } }); return { plan: context.direct.scenes, fill, generated: fill.jobs }; },
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
assert.equal(result.outputs.scenes.fill.jobs.length, 1);
assert.ok(elapsed < 75, `music/scenes should run in parallel; elapsed=${elapsed}ms`);
assert.deepEqual(events.sort(), ['music', 'scenes']);

const merged = mergeGeneratedShots(result.outputs.scenes.plan.concat([{ id: 's3' }]), [{ sourceShotId: 's3', jobId: 'fill-s3', media: 'generated://s3' }]);
assert.equal(merged.find((scene) => scene.id === 's3').generated, true);
assert.equal(getCompleteFilmProgress(result).percent, 100);

console.log('PASS: complete-film runtime parallel creative branches + AI fill + original soundtrack retention');
