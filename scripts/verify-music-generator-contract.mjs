import assert from 'node:assert/strict';
import { resolveMusicDuration, resolveMusicBpm } from '../src/musicGenerator.js';

assert.equal(resolveMusicDuration(30),30);
assert.equal(resolveMusicDuration(60),60);
assert.equal(resolveMusicDuration(2),5);
assert.equal(resolveMusicDuration(90),60);
assert.equal(resolveMusicDuration('45'),45);
assert.equal(resolveMusicDuration('invalid'),15);
assert.equal(resolveMusicBpm(128),128);
assert.equal(resolveMusicBpm(40),60);
assert.equal(resolveMusicBpm(220),180);
assert.equal(resolveMusicBpm('invalid'),112);

console.log('music-generator-contract: PASS');
