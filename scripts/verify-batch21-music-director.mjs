import assert from 'node:assert/strict';
import { inferMusicStyle, buildBeatGrid, buildSoundtrackBrief, alignCutsToMusic } from '../src/musicDirector.js';
import { attachSoundtrackToPlan, buildMusicReplacementMap } from '../src/beatAwareTimeline.js';

const rock=inferMusicStyle('dark energetic hard rock soundtrack for a cinematic reveal');
assert.equal(rock.genre,'hard-rock');
assert.ok(rock.bpm>=60 && rock.bpm<=180);

const brief=buildSoundtrackBrief({prompt:'fast electronic travel reel',duration:15});
assert.equal(brief.original,true);
assert.equal(brief.swapReady,true);
assert.ok(brief.beatGrid.beats.length>0);
assert.match(brief.copyrightRule,/Do not reproduce/);

const grid=buildBeatGrid({bpm:120,duration:8});
assert.equal(grid.beats[0].time,0);
assert.equal(grid.beats[1].time,0.5);
assert.equal(grid.beats[4].downbeat,true);

const plan=attachSoundtrackToPlan({creativePrompt:'energetic edit',targetDuration:8,cuts:[{startTime:0.11,endTime:1.03,duration:.92},{startTime:1.56,endTime:2.47,duration:.91}]},brief);
assert.equal(plan.musicSyncVersion,'beat-aware-v1');
assert.equal(plan.music.enabled,true);
assert.ok(plan.cuts.every(c=>c.music?.beatAligned===true));

const replacement=buildMusicReplacementMap(brief);
assert.equal(replacement.version,'music-replacement-map-v1');
assert.ok(replacement.beats.length>0);

console.log('batch21-music-director: PASS');
