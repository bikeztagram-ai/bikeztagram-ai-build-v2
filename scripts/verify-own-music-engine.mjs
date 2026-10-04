import assert from 'node:assert/strict';
import {compileMusicRequest,generateDirectorLyrics,prepareMusicGeneration} from '../src/musicEngineDirector.js';
import {buildSongBrain,songBrainToInstruction} from '../src/musicSongBrain.js';

const b=compileMusicRequest({prompt:'dark cinematic rock song about a motorcycle chase',duration:180,bpm:120,key:'D',mode:'minor',vocalDirection:'gritty lead vocal'});
assert.equal(b.version,'music-director-v2');
assert.equal(b.genre,'rock');
assert.equal(b.mood,'dark');
assert.equal(b.duration,180);
assert.ok(b.sections.includes('final chorus'));
assert.ok(b.instrumentPalette.includes('electric guitar'));
assert.match(b.instruction,/SONG BRAIN V2/);
assert.match(b.instruction,/Do not imitate/);

const brain=buildSongBrain({prompt:'funny upbeat country song about my dog Bowie',duration:90});
assert.equal(brain.genre,'country');
assert.equal(brain.energy,'high');
assert.ok(brain.arrangementArc.length>=6);
assert.ok(brain.instrumentPalette.includes('slide guitar'));
assert.match(songBrainToInstruction(brain),/INSTRUMENT PALETTE/);

const lyrics=generateDirectorLyrics(b);
assert.match(lyrics,/\[Chorus\]/);
assert.match(lyrics,/\[Bridge\]/);

const prepared=prepareMusicGeneration({prompt:'funny song about my dog',duration:30});
assert.ok(prepared.lyrics.length>80);
assert.ok(prepared.instruction.includes('Original'));
console.log('Own Music Engine V2 contract PASS — Song Brain, structured arrangement, original lyrics and renderer-neutral handoff.');
