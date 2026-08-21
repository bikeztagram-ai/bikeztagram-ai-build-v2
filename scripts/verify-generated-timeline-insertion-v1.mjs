import assert from 'node:assert/strict';
import {insertGeneratedMedia} from '../src/generatedTimelineInsertionV1.js';
const t=insertGeneratedMedia([{id:'a',start:0,end:3}],{id:'gen',url:'blob:test',duration:2,mimeType:'video/mp4',modelId:'candidate'},{start:3});assert.equal(t[1].id,'gen');assert.equal(t[1].source,'generated');assert.equal(t[1].start,3);console.log('Generated timeline insertion V1 verification passed');
