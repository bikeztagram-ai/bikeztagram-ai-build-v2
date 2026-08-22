import assert from 'node:assert/strict';
import { composeOriginalSong } from '../src/originalSongComposer.js';
const song=composeOriginalSong({bpm:120,duration:20,mood:'dark',energy:.8,seed:42});
assert.equal(song.original,true); assert.equal(song.bpm,120); assert.equal(song.scale,'minor'); assert.ok(song.chords.length>0); assert.ok(song.melody.length>0); assert.ok(song.bass.length>0); assert.match(song.copyrightGuard,/Original composition/);
const same=composeOriginalSong({bpm:120,duration:20,mood:'dark',energy:.8,seed:42}); assert.deepEqual(song.melody,same.melody);
console.log('Original song composer: PASS');
