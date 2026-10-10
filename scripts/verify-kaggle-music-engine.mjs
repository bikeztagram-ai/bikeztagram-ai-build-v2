import assert from 'node:assert/strict';

const api = await (await fetch('https://raw.githubusercontent.com/bikeztagram-ai/bikeztagram-ai-build-v2/main/api/music-engine.js')).text();
const workflow = await (await fetch('https://raw.githubusercontent.com/bikeztagram-ai/bikeztagram-ai-build-v2/main/.github/workflows/minimax-music3-kaggle.yml')).text();
const runner = await (await fetch('https://raw.githubusercontent.com/bikeztagram-ai/bikeztagram-ai-build-v2/main/scripts/kaggle/minimax_music3_batch.py')).text();

assert.doesNotMatch(api, /RUNPOD_API_KEY|RUNPOD_ENDPOINT_ID/);
assert.match(api, /GITHUB_ACTIONS_TOKEN/);
assert.match(api, /actions\/workflows\/.*dispatches/);
assert.match(api, /issueSignedToken/);
assert.match(api, /operation: 'put'/);
assert.match(api, /operation: 'get'/);

assert.match(workflow, /KAGGLE_API_TOKEN/);
assert.match(workflow, /bikeztagram-mx3-/);
assert.match(workflow, /NvidiaTeslaT4/);
assert.match(workflow, /cp scripts\/kaggle\/minimax_music3_batch\.py \.kaggle-music3-kernel\//, 'workflow must package the same low-VRAM runner that the verifier inspects');
assert.match(workflow, /Path\(\"\.kaggle-music3-kernel\/minimax_music3_batch\.py\"\)/, 'embedded request must target the selected runner');
assert.match(workflow, /\"code_file\": \"minimax_music3_batch\.py\"/, 'Kaggle metadata must launch the selected runner');
assert.doesNotMatch(workflow, /minimax_music3_sglang\.py/, 'obsolete SGLang runner must not be dispatched');
assert.match(workflow, /kaggle kernels push/);
assert.match(workflow, /kaggle kernels output/);
assert.match(workflow, /curl --fail-with-body/);

assert.match(runner, /MiniMaxAI\/MiniMax-Music3/);
assert.match(runner, /apply_group_offloading/);
assert.match(runner, /low_cpu_mem_usage=True/);
assert.match(runner, /audio_duration=duration/);
assert.match(runner, /music_request\.json/);

console.log('Zero-cost Kaggle Music Engine contract PASS.');
