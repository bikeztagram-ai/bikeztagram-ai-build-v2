import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
const cinematic=scoreMedia({type:'video',name:'cinematic tracking golden hour motorcycle',duration:6});
const plain=scoreMedia({type:'video',name:'random clip',duration:6});
assert.ok(cinematic>plain);
console.log('director-cinematic-v2: PASS');
