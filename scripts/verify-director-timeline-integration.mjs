import assert from 'node:assert/strict';
import { compileDirectorTimeline } from '../src/directorTimelineCompiler.js';

const plan = {
  title: 'Integration test',
  creativeRequest: 'cinematic motorcycle trailer',
  targetDuration: 10,
  sourceAnalysis: { durationSeconds: 12 },
  style: { dark: true },
  scenes: [
    { id: 'a', sourceType: 'uploaded', mediaIndex: 0, mediaId: 'bike-a', purpose: 'real-opening', startTime: 0.2, duration: 2 },
    { id: 'b', sourceType: 'uploaded', mediaIndex: 1, mediaId: 'bike-b', purpose: 'real-cinematic-beat', startTime: 3, duration: 2 },
    { id: 'c', sourceType: 'uploaded', mediaIndex: 0, mediaId: 'bike-a', purpose: 'real-action-speed', startTime: 6, duration: 2 },
    { id: 'd', sourceType: 'uploaded', mediaIndex: 1, mediaId: 'bike-b', purpose: 'real-hero-ending', startTime: 8, duration: 2 }
  ]
};

const compiled = compileDirectorTimeline(plan, { bpm: 120 });
assert.equal(compiled.version, '1.4');
assert.equal(compiled.cuts.length, 4);
assert.equal(compiled.story.beatAware, true);
assert.equal(compiled.cuts[0].mediaId, 'bike-a');
assert.equal(compiled.cuts[1].mediaId, 'bike-b');
assert.equal(compiled.cuts[2].storyRole, 'escalation');
assert.equal(compiled.cuts[3].storyRole, 'hero');
assert.ok(compiled.cuts.every((cut) => cut.sourceType === 'uploaded' && cut.generated === false));
assert.ok(compiled.cuts.every((cut) => cut.directorIntent?.preserveSubject === true));
assert.ok(compiled.cuts.some((cut) => cut.beatTreatment?.role === 'impact'));

console.log('director-timeline-integration: PASS');
