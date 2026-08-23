import assert from 'node:assert/strict';
import { createOriginalMusicWav, createOriginalPulseWav } from '../src/musicProvider.js';

const blob = createOriginalMusicWav(15, 112, { genre: 'rock', energy: .82, seed: 'verification' });
assert.equal(blob.type, 'audio/wav');
assert.ok(blob.size > 44_000, `expected non-trivial WAV, got ${blob.size}`);
const bytes = new Uint8Array(await blob.arrayBuffer());
assert.equal(String.fromCharCode(...bytes.slice(0,4)), 'RIFF');
assert.equal(String.fromCharCode(...bytes.slice(8,12)), 'WAVE');
assert.equal(String.fromCharCode(...bytes.slice(36,40)), 'data');
const compat = createOriginalPulseWav(15, 112);
assert.equal(compat.type, 'audio/wav');
assert.ok(compat.size > 44_000);
console.log(`batch77-musical-arrangement: PASS (${blob.size} bytes)`);
