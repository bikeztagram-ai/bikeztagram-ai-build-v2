import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('src/aiVideoProvider.js','utf8');
assert.match(source,/pollAttempts=60/,'AI video provider should expose a bounded configurable polling budget.');
assert.match(source,/pollIntervalMs=5000/,'AI video provider should expose a configurable polling interval.');
assert.match(source,/retry-after/,'AI video provider should respect Retry-After when polling is throttled.');
assert.match(source,/onStatus/,'AI video provider should expose optional generation telemetry.');
assert.match(source,/taskId:task\.id/,'Successful generations should preserve task provenance.');
assert.match(source,/pollAttempts:attempt\+1/,'Successful generations should report actual polling attempts.');
assert.match(source,/elapsedMs/,'Successful generations should report elapsed generation time.');
assert.match(source,/timed out after \$\{attempts\} polling attempts/,'Timeout errors should report the actual polling budget.');
console.log('ai-video-provider-hardening: PASS');
