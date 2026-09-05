import assert from 'node:assert/strict';
import fs from 'node:fs';

const analysis = fs.readFileSync(new URL('../src/aiAudioAnalysis.js', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('../src/musicRenderBridge.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/universalRenderRuntime.js', import.meta.url), 'utf8');
assert.match(analysis, /decodeAudioData/);
assert.match(analysis, /impactMarkers/);
assert.match(analysis, /beatGrid/);
assert.match(bridge, /analyzeAudioBlob/);
assert.match(bridge, /audioAnalysis/);
assert.match(runtime, /buildMusicRenderBridge\(\{ prompt,/);
assert.match(runtime, /audioAnalysis: musicBridge\.renderAudio/);
console.log('ai-audio-analysis: PASS');
