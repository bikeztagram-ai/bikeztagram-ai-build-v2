import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../src/universalRenderRuntime.js', import.meta.url), 'utf8');
assert.match(runtime, /renderInspectImprove\(\{mediaItems:media/);
assert.match(runtime, /expectedDuration:duration/);
assert.match(runtime, /renderUniversalProduction/);
assert.match(runtime, /buildMusicRenderBridge/);
assert.match(runtime, /evaluateRenderAcceptance/);

console.log('Universal render input contract: PASS');
