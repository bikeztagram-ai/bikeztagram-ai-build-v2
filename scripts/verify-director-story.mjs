import assert from 'node:assert/strict';
import { assignStoryRoles, scoreStoryCoherence, buildStoryDirection } from '../src/directorStoryModel.js';

const scenes = [
  { id: '1', purpose: 'real-opening', startTime: 0, continuityNotes: 'calm motorcycle reveal' },
  { id: '2', purpose: 'real-cinematic-beat', startTime: 2.5, continuityNotes: 'riding movement' },
  { id: '3', purpose: 'real-action', startTime: 5.1, continuityNotes: 'acceleration and speed' },
  { id: '4', purpose: 'real-cinematic-beat', startTime: 8.0, continuityNotes: 'approach' },
  { id: '5', purpose: 'real-hero-ending', startTime: 10.4, continuityNotes: 'hero motorcycle ending' }
];

const assigned = assignStoryRoles(scenes);
assert.equal(assigned[0].storyRole, 'hook');
assert.equal(assigned[2].storyRole, 'escalation');
assert.equal(assigned[4].storyRole, 'hero');
assert.equal(assigned[4].storyOrder, 5);

const coherence = scoreStoryCoherence(assigned);
assert.ok(coherence.score >= 80);
assert.equal(coherence.issues.length, 0);

const direction = buildStoryDirection(assigned, { beatMap: { beats: [{ time: 0 }] } });
assert.equal(direction.beatAware, true);
assert.equal(direction.roles.length, 5);
assert.match(direction.direction, /hero ending/i);

console.log('director-story: PASS');
