import assert from 'node:assert/strict';
import { buildSoundtrackBrief, inferMusicStyle, alignCutsToMusic } from '../src/musicDirector.js';

const action = inferMusicStyle('Create a dark cinematic motorcycle chase, fast and aggressive, 30 seconds at 140 BPM.');
assert.equal(action.genre, 'cinematic');
assert.equal(action.mood, 'dark');
assert.equal(action.bpm, 140);
assert.equal(action.energy, 0.95);

const brief = buildSoundtrackBrief({ prompt: '30 second moody motorcycle trailer at 140 BPM' });
assert.equal(brief.duration, 30);
assert.equal(brief.bpm, 140);
assert.equal(brief.mood, 'dark');
assert.equal(brief.original, true);
assert.equal(brief.beatGrid.duration, 30);
assert.ok(brief.sections.length >= 3);

const emotional = buildSoundtrackBrief({ prompt: '15 seconds of beautiful emotional sunset footage' });
assert.equal(emotional.genre, 'cinematic');
assert.equal(emotional.mood, 'emotional');
assert.equal(emotional.duration, 15);
assert.ok(emotional.energy < action.energy);

const aligned = alignCutsToMusic([
  { startTime: 0.03, duration: 1.9 },
  { startTime: 2.04, duration: 2.0 },
], brief);
assert.equal(aligned.length, 2);
assert.equal(aligned[0].music.beatAligned, true);
assert.ok(aligned.every((cut) => cut.duration > 0));

console.log('Prompt-driven music direction verification: PASS');
