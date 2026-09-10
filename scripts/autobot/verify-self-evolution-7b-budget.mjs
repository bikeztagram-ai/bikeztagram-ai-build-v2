#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/autobot-self-evolution.yml','utf8');
const engine=fs.readFileSync('builder/runner/aider-feature-brain.mjs','utf8');
assert.match(workflow,/qwen2\.5-coder:7b/);
assert.match(workflow,/AUTOBOT_AIDER_CALL_TIMEOUT_MS: 900000/);
assert.match(workflow,/AUTOBOT_VERIFICATION_RESERVE_MS: 90000/);
assert.match(workflow,/default: '30m'/);
assert.match(workflow,/LOCAL_AI_PROXY_NUM_CTX=8192/);
assert.match(workflow,/LOCAL_AI_PROXY_NUM_PREDICT=1500/);
assert.match(engine,/qwen2\.5-coder:7b/);
console.log('PASS: 7B primary self-evolution budget is aligned across workflow and engine.');
