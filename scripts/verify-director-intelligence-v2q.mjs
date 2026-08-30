import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
assert.ok(scoreMedia({type:'image',name:'motorcycle cinematic hero'})>scoreMedia({type:'image',name:'empty thumbnail'}));
console.log('director-image-v2: PASS');
