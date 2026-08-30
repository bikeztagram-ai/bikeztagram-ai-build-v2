import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
const strong=scoreMedia({type:'video',name:'motorcycle accelerating',duration:6,actionScore:.9});
const weak=scoreMedia({type:'video',name:'motorcycle accelerating',duration:6,actionScore:.1});
assert.ok(strong>weak);
console.log('director-action-quality-v2: PASS');
