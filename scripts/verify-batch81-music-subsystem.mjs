/* BIKEZTAGRAM AI — Batch-81 Music & Audio Subsystem Verification */
import assert from 'node:assert';
import { createOriginalCinematicWav, createMusicRuntimeFallback } from '../src/musicProviderV2.js';
import { inferMusicStyle, buildSoundtrackBrief, buildBeatGrid, snapTimeToBeat, alignCutsToMusic } from '../src/musicDirector.js';
import { applyAudioBeatSyncToPlan } from '../src/renderAudioBridge.js';
import { buildRhythmReplacementMap } from '../src/musicReplacementGuide.js';

console.log('Starting Batch-81 Music & Audio Subsystem verification...');

// 1. Test original cinematic wav generation & fallback
const wavBlob = createOriginalCinematicWav({ seconds: 15, bpm: 112, energy: 0.8 });
assert(wavBlob instanceof Blob, 'WAV generation should return a Blob');
assert(wavBlob.type === 'audio/wav', 'WAV blob should have audio/wav MIME type');
assert(wavBlob.size > 1000, 'WAV blob should contain audio data');

const fallback = createMusicRuntimeFallback({ duration: 15, bpm: 112 });
assert(fallback.source === 'local-original', 'Fallback source should be local-original');
assert(fallback.audioBlob instanceof Blob, 'Fallback should provide an audioBlob');
assert(fallback.metadata.bpm === 112, 'Fallback should preserve BPM');

// 2. Test soundtrack brief & style inference
const style = inferMusicStyle('An epic hard-rock motorcycle ride through the city at night');
assert(style.genre === 'hard-rock', `Expected hard-rock genre, got ${style.genre}`);
assert(style.bpm > 0, 'BPM must be positive');

const brief = buildSoundtrackBrief({ prompt: 'Epic rock action', duration: 20, bpm: 110 });
assert(brief.version === 'soundtrack-brief-v1', 'Soundtrack brief version check');
assert(brief.duration === 20, 'Brief duration check');
assert(Array.isArray(brief.beatGrid?.beats), 'Brief must include a beat grid');
assert(brief.beatGrid.beats.length > 0, 'Beat grid must not be empty');

// 3. Test beat snapping & cut alignment
const grid = buildBeatGrid({ bpm: 120, duration: 10 });
const snapped = snapTimeToBeat(1.05, grid, 0.2);
assert(typeof snapped === 'number', 'Snapped time should be a number');

const sampleCuts = [
  { startTime: 0, duration: 2, sourceIndex: 0 },
  { startTime: 2, duration: 3, sourceIndex: 1 }
];
const alignedCuts = alignCutsToMusic(sampleCuts, brief);
assert(alignedCuts.length === 2, 'Aligned cuts count');
assert(typeof alignedCuts[0].startTime === 'number', 'Aligned cut must have startTime');
assert(alignedCuts[0].music?.beatAligned === true, 'Cut should be marked beat aligned');

// 4. Test render audio bridge beat sync plan application
const testPlan = {
  targetDuration: 15,
  music: {
    beatGrid: brief.beatGrid,
    audioAnalysis: { beats: brief.beatGrid.beats, duration: 15 }
  },
  cuts: [
    { sourceIndex: 0, startTime: 0, duration: 3 },
    { sourceIndex: 1, startTime: 3, duration: 4 }
  ]
};
const syncResult = applyAudioBeatSyncToPlan(testPlan);
assert(syncResult.enabled === true, 'Beat sync should be enabled');
assert(syncResult.plan.music.beatSyncApplied === true, 'Plan should record beat sync application');

// 5. Test rhythm replacement map
const replacementMap = buildRhythmReplacementMap(testPlan, brief);
assert(replacementMap.format === 'bikeztagram-rhythm-replacement-v1', 'Replacement map format');
assert(replacementMap.copyrightSafe === true, 'Replacement map must be copyright safe');
assert(Array.isArray(replacementMap.editCuts), 'Replacement map must include edit cuts');

console.log('✅ Batch-81 Music & Audio Subsystem verification passed successfully.');
