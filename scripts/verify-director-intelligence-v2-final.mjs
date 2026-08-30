import assert from 'node:assert/strict';
import { scoreMedia, classifyMediaSubject, buildShotDirection } from '../src/director.js';
const parked=scoreMedia({type:'video',name:'motorcycle parked',duration:5});
const action=scoreMedia({type:'video',name:'motorcycle accelerating cornering chase',duration:5,actionScore:.9,cinematicScore:.85,compositionScore:.8});
assert.ok(action>parked+20);
assert.equal(classifyMediaSubject({name:'ATV quad trail'}),'vehicle');
assert.equal(buildShotDirection({subjectType:'vehicle',role:'action'}).motion.type,'tracking-push-pan');
console.log('director intelligence final proof: PASS');
