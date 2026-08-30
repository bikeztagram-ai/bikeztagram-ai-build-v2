import assert from 'node:assert/strict';
import { scoreMedia, classifyMediaSubject } from '../src/director.js';
assert.equal(classifyMediaSubject({name:'motorcycle cornering'}),'vehicle');
assert.ok(scoreMedia({type:'video',name:'motorcycle accelerating',duration:6,actionScore:.9})>scoreMedia({type:'video',name:'motorcycle parked',duration:6}));
console.log('director quick proof: PASS');
