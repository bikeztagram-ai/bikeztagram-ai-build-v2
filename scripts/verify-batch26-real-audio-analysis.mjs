import assert from 'node:assert/strict';
import fs from 'node:fs';

const analyzer=fs.readFileSync(new URL('../src/audioBeatAnalyzer.js',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('../src/musicGenerator.js',import.meta.url),'utf8');

assert.match(analyzer,/decodeAudioData/);
assert.match(analyzer,/autocorrelation/);
assert.match(analyzer,/onsets/);
assert.match(analyzer,/beats/);
assert.match(analyzer,/analysis:'real-audio-web-audio-v1'/);
assert.match(generator,/analyseAudioDataUrl/);
assert.match(generator,/audioAnalysis/);
assert.doesNotMatch(analyzer,/motorcycleModel|ninja1000|kawasaki/i);

console.log('batch26-real-audio-analysis: PASS');
