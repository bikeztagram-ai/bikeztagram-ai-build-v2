import { createAIEditPlan } from '../src/aiEditPlanner.js';

const mockAnalysis = {
  durationInSeconds: 20,
  bestMoments: [
    { start: 0, duration: 2.1, description: 'action moment 1' },
    { start: 5, duration: 4.2, description: 'action moment 2' },
    { start: 10, duration: 3.3, description: 'action moment 3' }
  ]
};

const mockMusicAnalysis = {
  beatGrid: [
    { time: 2.0 }, // Beat 1
    { time: 4.0 }, // Beat 2
    { time: 3.3 }, // Beat 3 (aligned to 3.3)
    { time: 8.0 }  // Beat 4
  ]
};

const basePlan = createAIEditPlan(mockAnalysis, { targetDuration: 15 });
const beatAlignedPlan = createAIEditPlan(mockAnalysis, { targetDuration: 15, musicAnalysis: mockMusicAnalysis });

console.log('Base plan durations:', basePlan.cuts.map(c => c.duration));
console.log('Beat-aligned plan durations:', beatAlignedPlan.cuts.map(c => c.duration));

const isAligned = beatAlignedPlan.cuts.every(cut => mockMusicAnalysis.beatGrid.some(beat => Math.abs(beat.time - cut.duration) < 0.1));

if (isAligned) {
  console.log('PASS: Beat alignment working.');
} else {
  console.error('FAIL: Beat alignment not working.');
  process.exit(1);
}
