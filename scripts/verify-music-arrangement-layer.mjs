import assert from 'node:assert/strict';
import {buildCinematicMusicArrangement,attachMusicEventsToCuts,describeMusicArrangement} from '../src/musicArrangement.js';

const arrangement=buildCinematicMusicArrangement({duration:15,bpm:120,energy:'rising'});
assert.equal(arrangement.duration,15);
assert.equal(arrangement.bpm,120);
assert.ok(arrangement.beatGrid.length>=29);
assert.ok(arrangement.sections.length>=3);
assert.ok(arrangement.events.some(e=>e.type==='impact'));

const cuts=attachMusicEventsToCuts([
  {startTime:0,duration:2,purpose:'hook'},
  {startTime:8,duration:2,purpose:'reveal'}
],arrangement);
assert.equal(cuts.length,2);
assert.ok(cuts.every(c=>c.music && Number.isFinite(c.music.beatTime)));
assert.match(describeMusicArrangement(arrangement),/BPM/);

console.log('music arrangement layer: PASS');
