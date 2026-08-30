import assert from 'node:assert/strict';
import { scoreMedia, classifyMediaSubject, buildShotDirection } from '../src/director.js';

const parked = scoreMedia({type:'video',name:'motorcycle parked outside',duration:5,width:1920,height:1080});
const action = scoreMedia({type:'video',name:'motorcycle accelerating cornering chase',duration:5,width:1920,height:1080,actionScore:.9,cinematicScore:.85,compositionScore:.8});
const long = scoreMedia({type:'video',name:'motorcycle moving',duration:40,width:1920,height:1080});
const medium = scoreMedia({type:'video',name:'motorcycle moving',duration:6,width:1920,height:1080});

assert.ok(action > parked + 20, `action footage should materially outrank parked footage: ${action} vs ${parked}`);
assert.ok(medium >= long, `very long footage should not outrank a social-friendly clip: ${medium} vs ${long}`);
assert.equal(classifyMediaSubject({name:'red scooter riding through town'}),'vehicle');
assert.equal(classifyMediaSubject({name:'ATV quad trail ride'}),'vehicle');
assert.equal(classifyMediaSubject({name:'moped parked outside'}),'vehicle');
const direction=buildShotDirection({subjectType:'vehicle',role:'action'});
assert.equal(direction.subjectType,'vehicle');
assert.equal(direction.role,'action');
assert.equal(direction.cameraIntent,'escalate-motion');
assert.ok(direction.motion?.type);
console.log('director-v2-intelligence: PASS');
