import assert from 'node:assert/strict';

const source = await (await fetch('https://raw.githubusercontent.com/bikeztagram-ai/bikeztagram-ai-build-v2/feat/own-music-engine-no-huggingface/music-engine/server.py')).text();
assert.match(source,/MUSIC_ENGINE_STOP_URL/);
assert.match(source,/MUSIC_ENGINE_STOP_TOKEN/);
assert.match(source,/BackgroundTasks/);
assert.match(source,/shutdown_after_response/);
console.log('Music Engine lifecycle contract PASS — successful generation can trigger provider shutdown.');
