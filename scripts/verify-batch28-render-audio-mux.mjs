import assert from 'node:assert/strict';
import fs from 'node:fs';

const renderer=fs.readFileSync(new URL('../src/renderer.js',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('../src/renderAudioBridge.js',import.meta.url),'utf8');

assert.match(renderer,/renderAudioBridge/);
assert.match(renderer,/attachPlanAudioToRenderStream/);
assert.match(renderer,/recorder\.start/);
assert.match(renderer,/audioBridge\?\.cleanup/);
assert.match(bridge,/createMediaStreamDestination/);
assert.match(bridge,/addTrack/);
assert.match(bridge,/audioDataUrl/);
assert.match(bridge,/createMediaElementSource/);
assert.match(bridge,/applyAudioBeatSyncToPlan/);
assert.match(bridge,/audioAnalysis/);
assert.match(bridge,/beatAligned/);
assert.match(bridge,/sourceStartTime/);

console.log('batch28-render-audio-mux: PASS');
