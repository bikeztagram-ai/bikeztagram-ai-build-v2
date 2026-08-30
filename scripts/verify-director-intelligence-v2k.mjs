import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
assert.ok(scoreMedia({type:'video',name:'motorcycle cinematic tracking',duration:6})>scoreMedia({type:'video',name:'empty parked thumbnail',duration:40}));
console.log('director-input-v2: PASS');
