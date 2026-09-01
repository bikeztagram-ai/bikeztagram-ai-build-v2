import assert from 'node:assert/strict';
import { buildUniversalProduction } from '../src/universalProductionConductor.js';
const moments=[
 {mediaIndex:0,startTime:0,description:'wide establishing landscape',shotType:'wide',score:90},
 {mediaIndex:1,startTime:3,description:'close-up subject detail',shotType:'close-up',score:88},
 {mediaIndex:2,startTime:6,description:'fast action movement',shotType:'action',score:94},
 {mediaIndex:3,startTime:10,description:'hero portrait at sunset',shotType:'wide',score:91}
];
const p=buildUniversalProduction({prompt:'dark cinematic energetic reveal',targetDuration:15,moments,hasVoiceover:true});
assert.equal(p.version,'universal-production-v1');
assert.ok(p.selectedMoments.length>0);
assert.equal(p.rhythm.length,p.selectedMoments.length);
assert.ok(p.audioDirection.beatMarkers.length>0);
assert.equal(p.audioTimeline.events.filter(e=>e.type==='cut').length,p.rhythm.length);
assert.equal(p.mixPlan.voiceover.enabled,true);
assert.ok(p.stages.includes('generate')&&p.stages.includes('qa')&&p.stages.includes('export'));
console.log('universal-production: PASS');
