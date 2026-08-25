import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('../src/musicGenerator.js',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('../src/renderAudioBridge.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../api/generate-music.js',import.meta.url),'utf8');
assert.match(app,/generateOriginalMusic/);assert.match(app,/soundtrack\.audioAvailable/);assert.match(app,/renderPlan\.music=\{\.\.\.musicResult\.soundtrack\}/);assert.match(app,/soundtrack processed/);assert.match(generator,/\/api\/generate-music/);assert.match(generator,/analyseAudioDataUrl/);assert.match(bridge,/audioDataUrl/);assert.match(bridge,/applyAudioBeatSyncToPlan/);assert.match(bridge,/stream\.addTrack/);assert.match(api,/source:'zero-cost-local-music'/);assert.match(api,/generationModel:'procedural-cinematic-v2'/);assert.match(api,/generationMode:'procedural-original'/);assert.match(api,/paidAiMusicDisabled:true/);assert.match(api,/copyright-safe cinematic soundtrack/);assert.doesNotMatch(api,/lyria-3-clip-preview/);
console.log('batch32-automatic-soundtrack-attachment: PASS');
