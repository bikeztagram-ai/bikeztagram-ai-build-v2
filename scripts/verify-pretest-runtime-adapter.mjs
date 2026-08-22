import assert from 'node:assert/strict';
import { prepareIntegratedRuntime } from '../src/pretestRuntimeAdapter.js';
const result=prepareIntegratedRuntime({prompt:'dark cinematic reveal with original hard rock soundtrack',duration:15,analysis:{bestMoments:[{mediaIndex:0,directorSelectionScore:100},{mediaIndex:1,directorSelectionScore:90},{mediaIndex:2,directorSelectionScore:80},{mediaIndex:3,directorSelectionScore:70},{mediaIndex:4,directorSelectionScore:60}]},plan:{cuts:[{mediaIndex:0,startTime:0,duration:2},{mediaIndex:1,startTime:2,duration:3},{mediaIndex:2,startTime:5,duration:3}]}});
assert.equal(result.story.length,5); assert.equal(result.music.original,true); assert.ok(result.renderPlan.renderGuard); assert.ok(result.renderPlan.cuts.every(c=>c.guard?.executable));
console.log('Integrated runtime adapter: PASS');
