import assert from 'node:assert/strict';
import fs from 'node:fs';

const renderer = fs.readFileSync(new URL('../src/renderer.js', import.meta.url), 'utf8');

// The stable renderer must seek once per cut, then let playback advance naturally.
const seekAssignments = (renderer.match(/currentTime\s*=\s*/g) || []).length;
assert.equal(seekAssignments, 1, 'renderer must retain exactly one source seek per cut');
assert.match(renderer, /video\.play\(\)/, 'renderer must use normal playback after seeking');
assert.match(renderer, /requestAnimationFrame\(frame\)/, 'renderer must sample live playback frames');
assert.match(renderer, /video\.ended/, 'renderer must explicitly handle source exhaustion');
assert.match(renderer, /last real frame is the/, 'renderer must preserve the final decoded frame instead of restarting');
assert.match(renderer, /duration\*1000/, 'renderer frame loop must follow the planned cut duration');
assert.match(renderer, /speedA.*speedB/, 'renderer must retain controlled speed-ramp execution');

// Guard against reintroducing the old repeated-seek/stutter pattern.
assert.doesNotMatch(renderer, /requestAnimationFrame\([^\n]*currentTime\s*=/, 'frame loop must not repeatedly seek the video');
assert.doesNotMatch(renderer, /currentTime\s*=.*requestAnimationFrame/, 'source seeking must not be coupled to the frame loop');

console.log('renderer-stability: PASS');
