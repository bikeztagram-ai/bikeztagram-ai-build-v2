import assert from 'node:assert/strict';
import { buildCoveragePlan, buildDirectorDecision, buildUniversalMediaProfile, rankDirectorCandidates, rankMediaForRole } from '../src/director.js';

const media=[
 {id:'weak',type:'image/jpeg',name:'motorcycle parked',width:1920,height:1080,score:55},
 {id:'action',type:'video/mp4',name:'motorcycle accelerating cornering speed',duration:6,width:1920,height:1080,cinematicScore:94,visualQuality:{detail:.9,contrast:.85,sharpness:.9},bestMoments:[{motionScore:.95,score:96}]},
 {id:'approach',type:'video/mp4',name:'rider approach mountain road journey',duration:5,width:1920,height:1080,cinematicScore:86,visualQuality:{detail:.8,contrast:.8}},
 {id:'reveal',type:'image/jpeg',name:'hero motorcycle reveal close-up detail',width:1080,height:1350,score:91,visualQuality:{detail:.95,contrast:.8}},
 {id:'wide',type:'image/jpeg',name:'wide mountain landscape sunset',width:1920,height:1080,score:88,visualQuality:{detail:.8,contrast:.9}},
 {id:'rider',type:'image/jpeg',name:'rider portrait dramatic',width:1080,height:1350,score:84}
];

assert.ok(rankMediaForRole(media[1],'action','fast cinematic motorcycle')>rankMediaForRole(media[0],'action','fast cinematic motorcycle'));
const candidates=rankDirectorCandidates(media,'action',{creativePrompt:'fast cinematic motorcycle',usedIndices:[0],usedFamilies:['wide']});
assert.equal(candidates[0].index,1);
assert.ok(candidates[0].evidenceScore>80);

const profile=buildUniversalMediaProfile(media);
assert.equal(profile.version,'universal-director-v2');
assert.equal(profile.mediaCount,6);
assert.ok(profile.items.some(item=>item.evidenceScore>80));

const normalizedMotion=buildUniversalMediaProfile([{type:'video/mp4',name:'normalized motion',cinematicScore:.8,motionScore:.95}]);
assert.ok(normalizedMotion.items[0].evidenceScore>70);

const plan=buildCoveragePlan(media,{creativePrompt:'fast cinematic motorcycle reveal',maxShots:5});
assert.equal(plan.length,5);
assert.deepEqual(plan.map(p=>p.role),['hook','build','action','reveal','hero-ending']);
assert.equal(new Set(plan.map(p=>p.mediaIndex)).size,plan.length);
assert.ok(new Set(plan.map(p=>p.family)).size>=3);
assert.ok(plan.every(p=>p.selectionReason.includes('role-aware editor selection')));
assert.ok(plan.every(p=>Number.isFinite(p.evidenceScore)&&Number.isFinite(p.promptMatch)));

const decision=buildDirectorDecision(media,{creativePrompt:'fast cinematic motorcycle reveal',maxShots:5});
assert.equal(decision.version,'universal-director-decision-v2');
assert.equal(decision.shotCount,5);
assert.equal(decision.decisionEvidence.length,5);
assert.ok(decision.decisionEvidence.every(item=>item.reason&&Number.isFinite(item.evidenceScore)));

const sparse=buildCoveragePlan([{name:'unknown clip',type:'video/mp4',duration:2}],{creativePrompt:'anything',maxShots:5});
assert.equal(sparse.length,1);
assert.equal(sparse[0].mediaIndex,0);

const deterministicA=JSON.stringify(buildDirectorDecision(media,{creativePrompt:'fast cinematic motorcycle reveal',maxShots:5}));
const deterministicB=JSON.stringify(buildDirectorDecision(media,{creativePrompt:'fast cinematic motorcycle reveal',maxShots:5}));
assert.equal(deterministicA,deterministicB);

console.log('director-v3-intelligence: PASS');
