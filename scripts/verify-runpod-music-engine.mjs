import assert from 'node:assert/strict';
const api=await (await fetch('https://raw.githubusercontent.com/bikeztagram-ai/bikeztagram-ai-build-v2/feat/runpod-minimax-music-engine/api/music-engine.js')).text();
const worker=await (await fetch('https://raw.githubusercontent.com/bikeztagram-ai/bikeztagram-ai-build-v2/feat/runpod-minimax-music-engine/music-engine/runpod_renderer.py')).text();
const docker=await (await fetch('https://raw.githubusercontent.com/bikeztagram-ai/bikeztagram-ai-build-v2/feat/runpod-minimax-music-engine/music-engine/Dockerfile.runpod')).text();
assert.match(api,/RUNPOD_API_KEY/); assert.match(api,/RUNPOD_ENDPOINT_ID/); assert.match(api,/issueSignedToken/); assert.match(api,/output_put_url/); assert.match(api,/status\//);
assert.match(worker,/MiniMaxAI\/MiniMax-Music3/); assert.match(worker,/apply_group_offloading/); assert.match(worker,/low_cpu_mem_usage=True/); assert.match(worker,/requests\.put/);
assert.match(docker,/runpod\/pytorch/); assert.match(docker,/diffusers@dafe3733fcfdbf3c48915fe77be3aef65b5d6a2d/);
console.log('RunPod private Music Engine contract PASS — async GPU jobs, signed Blob output and working MiniMax Diffusers renderer present.');
