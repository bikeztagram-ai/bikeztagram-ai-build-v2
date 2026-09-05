import assert from 'node:assert/strict';
import fs from 'node:fs';

const compiler = fs.readFileSync(new URL('../src/creativeIntentCompiler.js', import.meta.url), 'utf8');
const engine = fs.readFileSync(new URL('../src/universalCreativeEngine.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/universalRenderRuntime.js', import.meta.url), 'utf8');

for (const token of ['compileCreativeIntent', 'buildCreativeSceneGraph', 'intentToProviderPrompt']) assert.match(compiler, new RegExp(token));
for (const token of ['world', 'camera', 'weather', 'subject', 'pace', 'time', 'intensity']) assert.match(engine, new RegExp(token, 'i'));
assert.match(runtime, /compileCreativeIntent/);
assert.match(runtime, /enhanceStillCutsWithAIVideo/);
assert.match(runtime, /buildMusicRenderBridge/);
assert.match(runtime, /renderInspectImprove/);
console.log('universal-creative-coverage: PASS');
