import { strict as assert } from 'node:assert';
import { generateCinematicPlan } from '../src/director.js';
import { synthesizeSoundtrack } from '../src/musicGenerator.js';

console.log('Running Batch-82 End-Game Cinematic Quality & Music Verification...');

async function runTest() {
  // Test 1: AI Director production specification interpretation & cinematic polish
  const prompt = 'Create a high-energy cinematic mountain bike descent with dramatic pacing, beat-synced cuts, custom color grading, and a triumphant ending reveal.';
  const sampleMedia = [
    { id: 'm1', type: 'video', duration: 10, url: 'blob:m1' },
    { id: 'm2', type: 'video', duration: 12, url: 'blob:m2' },
    { id: 'm3', type: 'video', duration: 8, url: 'blob:m3' }
  ];

  const plan = await generateCinematicPlan({ prompt, media: sampleMedia });
  assert.ok(plan, 'Cinematic plan must be generated');
  assert.ok(plan.shots && plan.shots.length > 0, 'Plan must include cinematic shots');
  assert.equal(plan.cinematicQualityBar, 'production-grade', 'Must meet production-grade quality bar');
  assert.ok(plan.soundtrackSpec, 'Soundtrack specification must be present');
  assert.ok(plan.soundtrackSpec.beatSyncEnabled, 'Beat sync must be enabled for cinematic pacing');

  // Test 2: Original music generation with hooks, drops, and video-aware synchronization
  const musicResult = await synthesizeSoundtrack({
    prompt: plan.soundtrackSpec.prompt,
    duration: plan.duration || 30,
    mood: plan.soundtrackSpec.mood || 'triumphant',
    beatSync: true
  });
  assert.ok(musicResult, 'Music synthesis must return a result');
  assert.ok(musicResult.audioUrl || musicResult.buffer, 'Music result must provide audio asset');
  assert.ok(musicResult.beatMetadata && musicResult.beatMetadata.beats.length > 0, 'Music must include beat metadata for synchronization');
  assert.equal(musicResult.qualityTier, 'studio-master', 'Music must reach studio master tier');

  console.log('Batch-82 verification passed successfully!');
}

runTest().catch(err => {
  console.error('Batch-82 verification failed:', err);
  process.exit(1);
});
