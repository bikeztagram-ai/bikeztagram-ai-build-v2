import assert from 'node:assert/strict';
import { evaluateCinematicOutput, compareCinematicOutputs } from '../src/cinematicQualityEvaluator.js';

const good = evaluateCinematicOutput({
  creativePrompt: 'dark cinematic motorcycle reveal with energetic action', targetDuration: 12,
  cuts: [
    { duration:2, role:'hook', description:'strong opening motorcycle detail', motionStyle:'slow-push', transition:'fade-in' },
    { duration:2, role:'build', description:'rider approaching on road', motionStyle:'lateral-pan', transition:'hard-cut' },
    { duration:2, role:'reveal', description:'motorcycle three-quarter reveal', motionStyle:'slow-orbit', transition:'match-cut' },
    { duration:3, role:'action', description:'motorcycle accelerating', motionStyle:'tracking-push-pan', transition:'impact-cut', beatAligned:true },
    { duration:3, role:'hero-ending', description:'beautiful motorcycle hero ending', motionStyle:'gentle-push', transition:'fade-out' }
  ]
}, { audio:{present:true,durationAligned:true,beatAligned:true} });

assert.ok(good.score >= 75);
assert.notEqual(good.verdict, 'REJECT');
assert.equal(good.actualDuration, 12);
assert.equal(good.dimensions.audio.score, 100);

const weak = evaluateCinematicOutput({ targetDuration:15, creativePrompt:'energetic reveal', cuts:[{duration:8,description:'same shot'},{duration:8,description:'same shot'}] }, {audio:{present:false}});
assert.equal(weak.verdict, 'REJECT');
assert.ok(weak.issues.length >= 3);

const comparison = compareCinematicOutputs(weak, good);
assert.equal(comparison.improved, true);
assert.ok(comparison.delta > 0);

console.log('cinematic-quality-evaluator: PASS');
