import assert from 'node:assert/strict';
import {revisePlanAfterQA,revisePlanAfterCinematicQuality} from '../src/renderQualityLoop.js';
const base={targetDuration:12,cuts:[
 {duration:3,role:'hook',colorGrade:'dark-cinematic',motionStyle:'static',transition:'hard-cut'},
 {duration:3,role:'build',colorGrade:'dark-cinematic',motionStyle:'static',transition:'hard-cut'},
 {duration:3,role:'action',colorGrade:'dark-cinematic',motionStyle:'static',transition:'hard-cut'},
 {duration:3,role:'hero-ending',colorGrade:'dark-cinematic',motionStyle:'static',transition:'hard-cut'}
]};
const qa=revisePlanAfterQA(base,{verdict:'FAIL_TOO_DARK',frameQA:{averageLuma:10},durationDifferenceSeconds:2.2,expectedDurationSeconds:12,durationSeconds:14,playbackAdvanced:false});
assert.equal(qa.changed,true);
assert.ok(qa.reasons.includes('increase-output-luminance'));
assert.ok(qa.reasons.includes('correct-editorial-duration'));
const cinematic=revisePlanAfterCinematicQuality(base,{verdict:'REJECT',score:55,issues:['motion variety','transition variety','shot-family variety','narrative progression']});
assert.equal(cinematic.changed,true);
assert.ok(cinematic.reasons.includes('increase-motion-variety'));
assert.ok(cinematic.reasons.includes('increase-transition-variety'));
assert.ok(cinematic.reasons.includes('increase-shot-family-variety'));
assert.ok(cinematic.reasons.includes('strengthen-story-progression'));
console.log('RENDER REVISION HARDENING PASS');
