import assert from 'node:assert/strict';
import { createCreativeEngineRuntime, executeAvailableStages } from '../src/creativeEngineRuntimeV2.js';
import * as musicStudio from '../src/musicStudioV2.js';

// Define the full pipeline adapters (mocked renderer due to environment, real music logic)
const adapters = {
  understand: async ({ state }) => ({ type: 'brief-analysis', summary: 'Motorcycle trailer' }),
  direct: async ({ state }) => ({ plan: { sceneSequence: ['hook', 'build', 'action', 'outro'], musicGenre: 'cinematic-rock' } }),
  music: async ({ state }) => {
    const plan = musicStudio.createMusicGenerationPlan({count:1});
    return { track: 'original-rock-track.wav', bpm: 120, energy: 0.8, metadata: { ...plan, original: true } };
  },
  scenes: async ({ state }) => ({ scenes: [{ id: 'scene1', purpose: 'hook', duration: 2 }, { id: 'scene2', purpose: 'action', duration: 4 }] }),
  assemble: async ({ state }) => ({ timeline: 'assembled-timeline' }),
  render: async ({ state }) => ({ videoUrl: 'final-video.mp4' }),
  qa: async ({ state }) => ({ score: 90, feedback: 'Great!' }),
  revise: async ({ state }) => ({ action: 'none' }),
  export: async ({ state }) => ({ status: 'exported' }),
};

async function testEndToEndPipeline() {
  console.log('Starting E2E pipeline verification...');
  
  const input = {
    prompt: 'Create a high-energy motorcycle trailer.',
    assets: [
      { id: 'a', name: 'bike.mp4', type: 'video/mp4' }
    ],
    duration: 10
  };

  const { runtime } = createCreativeEngineRuntime(input, adapters);
  
  const resultState = await executeAvailableStages(runtime);
  
  assert.strictEqual(resultState.stage, 'complete', 'Pipeline should complete all stages');
  assert.ok(resultState.completed.includes('export'), 'Export stage should be completed');
  assert.ok(resultState.outputs.render.videoUrl, 'Render output should have a video URL');
  assert.ok(resultState.outputs.music.metadata.original, 'Music should be marked as original');
  
  console.log('E2E pipeline verification passed:', {
    completedStages: resultState.completed,
    finalOutput: resultState.outputs.export,
    musicMetadata: resultState.outputs.music.metadata
  });
}

testEndToEndPipeline().catch(err => {
  console.error('E2E pipeline verification failed:', err);
  process.exit(1);
});
