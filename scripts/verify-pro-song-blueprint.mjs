import assert from 'node:assert/strict';
import { buildProSongBlueprint } from '../src/proSongBlueprint.js';
const b=buildProSongBlueprint({prompt:'original cinematic rock song',duration:90});
assert.equal(b.original,true); assert.ok(b.structure.length>=8); assert.ok(b.structure.some(s=>s.id==='chorus-1')); assert.ok(b.hook.identity.includes('original')); assert.match(b.copyrightGuard,/No imitation/);
console.log('Professional song blueprint: PASS');
