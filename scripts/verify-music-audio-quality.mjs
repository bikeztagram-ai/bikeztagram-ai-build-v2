import assert from 'node:assert/strict';
import { analyseMusicAudio } from '../src/musicQualityEvaluator.js';

const sampleRate = 48000;
const seconds = 12;
const frames = sampleRate * seconds;
const left = new Float32Array(frames);
const right = new Float32Array(frames);

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const envelope = 0.35 + 0.15 * Math.sin(2 * Math.PI * 0.5 * t);
  const bass = 0.18 * Math.sin(2 * Math.PI * 80 * t);
  const mid = 0.16 * Math.sin(2 * Math.PI * 440 * t);
  const high = 0.08 * Math.sin(2 * Math.PI * 7000 * t);
  left[i] = envelope * (bass + mid + high);
  right[i] = envelope * (bass + mid + high * 0.85);
}

const healthy = analyseMusicAudio({ channels: [left, right], sampleRate, durationSeconds: seconds });
assert.equal(healthy.version, 'music-audio-quality-v1');
assert.equal(healthy.metrics.channels, 2);
assert.ok(Number.isFinite(healthy.metrics.integratedLoudnessDb));
assert.ok(Number.isFinite(healthy.metrics.peakDbfs));
assert.ok(healthy.technicalScore >= 0 && healthy.technicalScore <= 100);
assert.ok(['PASS', 'REVIEW', 'REGENERATE'].includes(healthy.verdict));

const clipped = left.slice();
clipped.fill(1);
const bad = analyseMusicAudio({ channels: [clipped], sampleRate, durationSeconds: 2 });
assert.ok(bad.issues.includes('true-peak-risk'));
assert.equal(bad.verdict, 'REGENERATE');

console.log('MUSIC AUDIO QUALITY EVALUATOR PASS');
console.log(JSON.stringify({
  healthyScore: healthy.technicalScore,
  healthyVerdict: healthy.verdict,
  badScore: bad.technicalScore,
  badVerdict: bad.verdict,
  detectedIssues: bad.issues
}));
