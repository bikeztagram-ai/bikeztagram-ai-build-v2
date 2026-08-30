import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
for(const m of [{type:'video',name:'x',duration:0},{type:'video',name:'x',duration:500},{type:'image',name:'x'}]){const s=scoreMedia(m);assert.ok(s>=0&&s<=100);}
console.log('director-bounds-v2: PASS');
