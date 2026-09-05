import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../src/universalRenderRuntime.js', import.meta.url), 'utf8');
const contract = fs.readFileSync(new URL('../docs/universal-media-runtime.md', import.meta.url), 'utf8');

assert.match(runtime, /enhanceStillCutsWithAIVideo/);
assert.match(runtime, /productionMedia\s*=\s*enhanced\.mediaItems/);
assert.match(contract, /first-class production asset/i);
assert.match(contract, /playable media source/i);
assert.match(contract, /must never depend on Gemini/i);
console.log('universal-media-runtime: PASS');
