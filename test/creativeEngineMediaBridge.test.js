import assert from 'node:assert/strict';
import { summariseCreativeAssets, buildCreativeBrief, buildSceneRequests, buildMusicRequest } from '../src/creativeEngineMediaBridge.js';

const assets = [
  { id: 'a1', name: 'bike.jpg', type: 'image/jpeg', width: 1920, height: 1080, subjectId: 'bike-1' },
  { id: 'a2', name: 'ride.mp4', type: 'video/mp4', duration: 8, subjectId: 'bike-1' },
];
const summary = summariseCreativeAssets(assets);
assert.equal(summary.length, 2);
assert.equal(summary[0].kind, 'image');
assert.equal(summary[1].kind, 'video');

const brief = buildCreativeBrief({ request: 'Make a dark cinematic trailer with a powerful reveal.', assets });
assert.equal(brief.assetSummary.mixed, true);
assert.equal(brief.generationPolicy.originalWorldsOnly, true);
assert.equal(brief.generationPolicy.avoidCopyrightImitatingStyles, true);

const scenes = buildSceneRequests(brief, { cuts: [{ generated: true, generationPrompt: 'Original night ride through a rain-soaked city', duration: 3, mediaIndex: 1 }] });
assert.equal(scenes.length, 1);
assert.equal(scenes[0].originalWorld, true);
assert.equal(scenes[0].subjectId, 'bike-1');

const music = buildMusicRequest(brief, { duration: 15, bpm: 128, mood: 'dark cinematic', energy: 0.8 });
assert.equal(music.type, 'original-music');
assert.equal(music.bpm, 128);
assert.equal(music.originalOnly, true);

console.log('creativeEngineMediaBridge: PASS');
