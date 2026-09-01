import assert from 'node:assert/strict';
import { buildCompositionRuntime, buildMusicTimeline } from '../src/musicCompositionRuntime.js';
const r=buildCompositionRuntime({prompt:'fast cinematic action reveal',duration:15});assert.ok(r.events.length>10);assert.ok(r.stems.rhythm.length>0);assert.ok(r.stems.impacts.length>0);const t=buildMusicTimeline(r,[{startTime:0},{startTime:3.2,role:'action'}]);assert.equal(t.length,2);assert.ok(Number.isFinite(t[1].delta));console.log('music-composition-runtime: PASS');
