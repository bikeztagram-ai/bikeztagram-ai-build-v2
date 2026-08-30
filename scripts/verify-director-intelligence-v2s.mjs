import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
const hd=scoreMedia({type:'video',name:'motorcycle',duration:6,width:1920,height:1080});
const tiny=scoreMedia({type:'video',name:'motorcycle',duration:6,width:320,height:180});
assert.ok(hd>=tiny);
console.log('director-dimensions-v2: PASS');
