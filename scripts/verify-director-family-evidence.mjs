#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildUniversalMediaProfile } from '../src/director.js';

const profile=buildUniversalMediaProfile([
  {type:'video/mp4',name:'motorcycle action riding speed cornering'},
  {type:'video/mp4',name:'hero reveal showcase portrait sunset'},
  {type:'image/jpeg',name:'mountain landscape establishing environment panorama'},
  {type:'image/jpeg',name:'cockpit detail close-up badge texture'}
]);

assert.deepEqual(profile.items.map(item=>item.family),['action','hero','wide','detail']);
assert.ok(profile.items.every(item=>Number.isFinite(item.evidenceScore)));
console.log('director-family-evidence: PASS');
