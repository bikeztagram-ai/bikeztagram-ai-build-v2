import assert from 'node:assert/strict';
import {createLocalMusicRuntime,normaliseMusicResult} from '../src/localMusicRuntimeV1.js';
const unavailable=createLocalMusicRuntime();
assert.equal((await unavailable.generateMusic({prompt:'dark cinematic'})).status,'fallback-required');
const runtime=createLocalMusicRuntime({available:true,generate:async r=>({status:'generated',audioUrl:'track.wav',duration:15,bpm:128,events:[{time:6,type:'drop'}],modelId:'local-test'})});
const result=normaliseMusicResult(await runtime.generateMusic({prompt:'dark cinematic'}));
assert.equal(result.status,'generated');assert.equal(result.bpm,128);assert.equal(result.events[0].type,'drop');
console.log('Local music runtime V1 verification passed');
