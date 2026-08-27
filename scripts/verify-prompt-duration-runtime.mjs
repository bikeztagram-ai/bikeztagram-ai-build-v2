import assert from 'node:assert/strict';
import { resolvePromptDuration, PROMPT_DURATION_LIMITS } from '../src/promptDuration.js';

assert.equal(resolvePromptDuration('Make a 30 second cinematic reel'), 30);
assert.equal(resolvePromptDuration('Create a 1 minute cinematic film'), 60);
assert.equal(resolvePromptDuration('Make it 12s, dark and punchy'), 12);
assert.equal(resolvePromptDuration('Make a 0.5 minute teaser'), 30);
assert.equal(resolvePromptDuration('cinematic motorcycle reveal', 18), 18);
assert.equal(resolvePromptDuration('', 90), PROMPT_DURATION_LIMITS.max);
assert.equal(resolvePromptDuration('cinematic film', 3), PROMPT_DURATION_LIMITS.min);
assert.equal(resolvePromptDuration('Make a 75 second film'), PROMPT_DURATION_LIMITS.max);
assert.equal(resolvePromptDuration('Make a 2 minute film'), PROMPT_DURATION_LIMITS.max);

console.log('prompt-duration-runtime: PASS');
