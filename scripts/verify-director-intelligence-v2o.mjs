import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
const high=scoreMedia({type:'video',name:'motorcycle',duration:6,actionScore:.9,cinematicScore:.9,compositionScore:.9});
const low=scoreMedia({type:'video',name:'motorcycle',duration:6,actionScore:.1,cinematicScore:.1,compositionScore:.1});
assert.ok(high>low);
console.log('director-confidence-v2: PASS');
