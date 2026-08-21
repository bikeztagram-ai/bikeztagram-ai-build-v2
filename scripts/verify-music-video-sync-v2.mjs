import assert from 'node:assert/strict';
import {buildSyncPlan} from '../src/musicVideoSyncV2.js';
const p=buildSyncPlan({events:[{time:4,type:'drop'}],shots:[{start:0},{start:4},{start:8}]});assert.equal(p.mappings[0].shotIndex,1);assert.equal(p.mappings[0].action,'reveal-or-impact');assert.equal(p.policy.avoidBeatSpam,true);console.log('Music video sync V2 verification passed');
