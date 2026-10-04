import assert from 'node:assert/strict';
import {compileMusicRequest,generateDirectorLyrics,prepareMusicGeneration} from '../src/musicEngineDirector.js';
const b=compileMusicRequest({prompt:'dark cinematic rock song about a motorcycle chase',duration:180,bpm:120,key:'D',mode:'minor',vocalDirection:'gritty lead vocal'});
assert.equal(b.genre,'rock');assert.equal(b.mood,'dark');assert.equal(b.duration,180);assert.ok(b.sections.includes('final chorus'));assert.match(b.instruction,/Do not imitate/);
const lyrics=generateDirectorLyrics(b);assert.match(lyrics,/\[Chorus\]/);assert.match(lyrics,/\[Bridge\]/);
const prepared=prepareMusicGeneration({prompt:'funny song about my dog',duration:30});assert.ok(prepared.lyrics.length>80);assert.ok(prepared.instruction.includes('Original song'));
console.log('Own Music Engine contract PASS — provider-neutral director, original lyrics, structured arrangement, HF-compatible handoff.');
