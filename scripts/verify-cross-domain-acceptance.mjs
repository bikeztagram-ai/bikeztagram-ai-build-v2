import assert from 'node:assert/strict';
import {buildUniversalMediaProfile,buildDirectorDecision,classifyMediaSubject} from '../src/director.js';

const cases=[
 ['motorcycle','motorcycle riding on mountain road'],
 ['car','sports car driving fast on road'],
 ['person','traveller walking through city'],
 ['product','product showcase close up watch'],
 ['travel','landscape journey sunset lake'],
 ['animal','dog running through field'],
 ['mixed','motorcycle rider beside mountain landscape'],
];
for(const [name,description] of cases){
 const media=[{name:description,type:'video',duration:4,width:1920,height:1080,score:82,cinematicScore:.82,motionScore:.8,subject:{label:description}}];
 assert.equal(classifyMediaSubject(media[0]),name==='travel'?'landscape':name==='mixed'?'vehicle':'vehicle');
 const profile=buildUniversalMediaProfile(media);
 assert.equal(profile.version,'universal-director-v2');
 const decision=buildDirectorDecision(media,{creativePrompt:'Create a cinematic '+description,maxShots:1,targetDuration:4});
 assert.equal(decision.shotCount,1);
 assert.equal(decision.version,'universal-director-decision-v2');
}
const mixed=[
 {name:'wide mountain landscape',type:'video',duration:4,width:1920,height:1080,score:85,subject:'landscape'},
 {name:'rider motorcycle cornering action',type:'video',duration:4,width:1920,height:1080,score:90,subject:'motorcycle rider'},
 {name:'hero motorcycle sunset reveal',type:'video',duration:4,width:1920,height:1080,score:88,subject:'motorcycle'},
 {name:'rider close detail',type:'image',width:1920,height:1080,score:80,subject:'rider'},
];
const d=buildDirectorDecision(mixed,{creativePrompt:'fast motorcycle action with a dramatic hero reveal',maxShots:4,targetDuration:12});
assert.equal(d.shotCount,4);
assert.ok(new Set(d.coverage.map(x=>x.role)).size>=3);
assert.ok(d.coverage.some(x=>x.role==='action'));
console.log('CROSS-DOMAIN ACCEPTANCE MATRIX PASS');
console.log(JSON.stringify({cases:cases.map(x=>x[0]),mixedRoles:d.coverage.map(x=>x.role),mixedSubjects:d.coverage.map(x=>x.subjectType)},null,2));