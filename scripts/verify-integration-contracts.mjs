import assert from 'node:assert/strict';
import { buildStoryArc } from '../src/storyArcEngine.js';
import { buildSoundtrackBrief, buildBeatGrid, alignCutsToMusic } from '../src/musicDirector.js';
import { guardRenderPlan } from '../src/renderDecisionGuard.js';

const arc=buildStoryArc([
 {mediaIndex:0,directorSelectionScore:100,qualityScore:100},
 {mediaIndex:1,directorSelectionScore:90,qualityScore:90},
 {mediaIndex:2,directorSelectionScore:80,qualityScore:80},
 {mediaIndex:3,directorSelectionScore:70,qualityScore:70},
 {mediaIndex:4,directorSelectionScore:60,qualityScore:60}
],'cinematic reveal');
assert.deepEqual(arc.map(x=>x.role),['mystery','anticipation','reveal','escalation','hero']);

const music=buildSoundtrackBrief({prompt:'original cinematic hard rock reveal',duration:15});
assert.equal(music.original,true);
assert.ok(music.beatGrid.beats.length>0);
const aligned=alignCutsToMusic([{mediaIndex:0,startTime:0,duration:2},{mediaIndex:1,startTime:2,duration:3}],music);
assert.equal(aligned.length,2);

const guarded=guardRenderPlan({cuts:aligned.map(c=>({...c,duration:c.duration||1}))});
assert.equal(guarded.renderGuard.version,'v1');
assert.ok(guarded.cuts.every(c=>c.guard?.executable));

console.log('Integrated Director + Music + Render contract: PASS');
