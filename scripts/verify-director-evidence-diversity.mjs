import assert from 'node:assert/strict';
import { buildDirectorDecision, buildUniversalMediaProfile } from '../src/director.js';

const media=[
 {name:'wide mountain road',type:'image',width:1920,height:1080},
 {name:'rider accelerating',type:'video',duration:4,motionScore:8},
 {name:'close-up detail badge',type:'image',width:1600,height:1200},
 {name:'hero sunset motorcycle reveal',type:'video',duration:3,motionScore:5}
];
const profile=buildUniversalMediaProfile(media);
assert.equal(profile.version,'universal-director-v2');
assert.ok(profile.items.every(item=>item.family));
const decision=buildDirectorDecision(media,{creativePrompt:'dark cinematic action reveal',maxShots:5});
assert.ok(decision.shotCount>=4);
assert.equal(decision.coverage.length,decision.decisionEvidence.length);
assert.ok(decision.decisionEvidence.every(item=>Number.isFinite(item.score)&&item.reason));
const indices=decision.coverage.map(item=>item.mediaIndex);
assert.equal(new Set(indices).size,indices.length,'director reused a source within one coverage plan');
assert.ok(new Set(decision.coverage.map(item=>item.family)).size>=3,'director did not achieve useful shot-family diversity');
console.log('PASS director evidence and coverage diversity contract');
