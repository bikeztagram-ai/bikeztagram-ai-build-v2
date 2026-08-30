import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
const long=scoreMedia({type:'video',name:'motorcycle moving',duration:40,width:1920,height:1080});
const medium=scoreMedia({type:'video',name:'motorcycle moving',duration:6,width:1920,height:1080});
assert.ok(medium>long,`medium duration should outrank very long duration: ${medium} vs ${long}`);
console.log('director-duration-v2: PASS');
