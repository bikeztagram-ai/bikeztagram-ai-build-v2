import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../api/music.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../src/aiMusicProvider.js', import.meta.url), 'utf8');
const registry = fs.readFileSync(new URL('../src/registerCreativeCapabilities.js', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('../src/musicStudio.jsx', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('../src/musicRenderBridge.js', import.meta.url), 'utf8');

assert.match(api, /ACE_STEP_API_URL/);
assert.match(api, /\/release_task/);
assert.match(api, /\/query_result/);
assert.match(api, /ACE-Step 1\.5/);
assert.doesNotMatch(api, /ELEVENLABS|Eleven Music/i);

assert.match(client, /\/api\/music/);
assert.match(client, /ACE-Step 1\.5/);
assert.doesNotMatch(client, /Eleven/i);

assert.match(registry, /ACE-Step 1\.5/);
assert.doesNotMatch(registry, /Eleven Music/i);

assert.doesNotMatch(studio, /ELEVENLABS|Eleven Music/i);
assert.match(studio, /AI MUSIC/);

assert.doesNotMatch(bridge, /Eleven Music/i);
assert.match(bridge, /ACE-Step/);

console.log('ACE-Step open-source music provider contract: PASS');
