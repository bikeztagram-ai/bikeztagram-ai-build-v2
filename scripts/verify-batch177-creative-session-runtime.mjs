import assert from 'node:assert/strict';
import { createCreativeSession, transitionCreativeSession, appendRevision, canResumeCreativeSession, summarizeCreativeSession } from '../src/creativeSessionStateV1.js';
import { executeCreativeSession } from '../src/creativeSessionExecutorV1.js';

const session = createCreativeSession({ request: 'Make a cinematic motorcycle trailer', assets: [{ name: 'bike.mp4', type: 'video/mp4', url: 'blob:test' }] });
assert.equal(session.stage, 'intake');
assert.equal(session.assets.length, 1);
const directed = transitionCreativeSession(session, 'brief', { brief: { story: 'reveal' } });
assert.equal(directed.stage, 'brief');
assert.equal(appendRevision(directed, { reasons: ['weak ending'] }).revisions.length, 1);
assert.equal(canResumeCreativeSession(directed), true);

const calls = [];
const result = await executeCreativeSession({
  request: 'Create a cinematic trailer',
  assets: session.assets,
  director: async ({ mode }) => { calls.push(`director:${mode}`); return { mode }; },
  musicDirector: async ({ mode = 'plan' }) => { calls.push(`music:${mode}`); return { audioUrl: 'blob:music', bpm: 120 }; },
  sceneDirector: async ({ mode = 'plan' }) => { calls.push(`scene:${mode}`); return mode === 'execute' || mode === 'revise' ? [{ id: 'scene-1', url: 'blob:scene' }] : [{ prompt: 'hero road shot' }]; },
  assembler: async () => ({ cuts: [{ source: 'scene-1', duration: 2 }] }),
  renderer: async () => ({ blob: 'rendered' }),
  qa: async () => ({ verdict: 'pass', score: 0.92 }),
  exporter: async () => ({ url: 'blob:export', format: 'mp4' })
});

assert.equal(result.stage, 'complete');
assert.equal(result.qa.verdict, 'pass');
assert.equal(result.export.format, 'mp4');
assert.ok(calls.includes('director:brief'));
assert.ok(calls.includes('director:direction'));
assert.ok(calls.includes('music:execute'));
assert.ok(calls.includes('scene:execute'));
assert.equal(summarizeCreativeSession(result).complete, true);
console.log('batch177-creative-session-runtime: PASS');
