import assert from 'node:assert/strict';

const scenes = [
  { purpose: 'real-opening', transitionIn: 'fade-in', transitionOut: 'cinematic-blend', motionStyle: 'slow-push', motionIntensity: 0.55, speed: 0.92, speedEnd: 1.0 },
  { purpose: 'real-cinematic-beat', transitionIn: 'crossfade', transitionOut: 'action-blend', motionStyle: 'pan-right', motionIntensity: 0.7, speed: 1.0, speedEnd: 1.08 },
  { purpose: 'real-action', transitionIn: 'hard-cut', transitionOut: 'cinematic-blend', motionStyle: 'slow-push', motionIntensity: 0.82, speed: 1.08, speedEnd: 1.18 },
  { purpose: 'real-cinematic-beat', transitionIn: 'crossfade', transitionOut: 'cinematic-blend', motionStyle: 'pan-left', motionIntensity: 0.65, speed: 0.96, speedEnd: 1.0 },
  { purpose: 'real-action', transitionIn: 'hard-cut', transitionOut: 'action-blend', motionStyle: 'tilt-up', motionIntensity: 0.72, speed: 1.05, speedEnd: 1.2 },
  { purpose: 'real-hero-ending', transitionIn: 'crossfade', transitionOut: 'fade-out', motionStyle: 'slow-pull', motionIntensity: 0.5, speed: 0.9, speedEnd: 0.82 },
];

assert.equal(scenes.length, 6);
assert.equal(scenes[0].motionStyle, 'slow-push');
assert.equal(scenes[5].motionStyle, 'slow-pull');
assert.ok(new Set(scenes.map((s) => s.motionStyle)).size >= 4, 'treatment should vary motion');
assert.ok(new Set(scenes.map((s) => s.transitionIn)).size >= 3, 'treatment should vary transitions');
assert.ok(scenes.some((s) => s.speed > 1), 'action treatment should include acceleration');
assert.ok(scenes.some((s) => s.speed < 1), 'opening/hero treatment should include breathing room');
assert.ok(scenes.every((s) => s.motionIntensity >= 0 && s.motionIntensity <= 1.5));
assert.ok(scenes.every((s) => s.speed >= 0.5 && s.speed <= 1.5 && s.speedEnd >= 0.5 && s.speedEnd <= 1.5));

console.log('cinematic-treatment: PASS');
