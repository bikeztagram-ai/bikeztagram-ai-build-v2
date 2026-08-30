import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';
const parked=scoreMedia({type:'video',name:'motorcycle parked',duration:5,width:1920,height:1080});
const action=scoreMedia({type:'video',name:'motorcycle accelerating cornering chase',duration:5,width:1920,height:1080,actionScore:.9,cinematicScore:.85,compositionScore:.8});
assert.ok(action>parked+20,`action should materially outrank parked footage: ${action} vs ${parked}`);
console.log('director-action-v2: PASS');
