import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
const moving=scoreMedia({type:'video',name:'motorcycle moving',duration:6});
const parked=scoreMedia({type:'video',name:'motorcycle parked',duration:6});
assert.ok(moving>parked);
console.log('director-static-v2: PASS');
