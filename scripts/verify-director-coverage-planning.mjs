import assert from 'node:assert/strict';
import { buildCoveragePlan, buildDirectorDecision, rankMediaForRole } from '../src/director.js';

const media = [
  { id:'rider-action', type:'video/mp4', name:'motorcycle riding cornering action', duration:5, width:1920, height:1080, score:88 },
  { id:'static-bike', type:'image/jpeg', name:'motorcycle parked hero detail', width:1920, height:1080, score:82 },
  { id:'landscape', type:'video/mp4', name:'mountain landscape journey', duration:4, width:1920, height:1080, score:76 },
  { id:'rider-portrait', type:'image/jpeg', name:'rider portrait reveal', width:1080, height:1350, score:84 },
  { id:'speed', type:'video/mp4', name:'bike accelerating speed chase', duration:6, width:1920, height:1080, score:86 },
];

assert.ok(rankMediaForRole(media[0], 'action', 'fast motorcycle reel') > rankMediaForRole(media[1], 'action', 'fast motorcycle reel'));
const plan = buildCoveragePlan(media, { creativePrompt:'fast cinematic motorcycle reel', maxShots:5 });
assert.equal(plan.length, 5);
assert.deepEqual(plan.map(p => p.role), ['hook','build','action','reveal','hero-ending']);
assert.equal(new Set(plan.map(p => p.mediaIndex)).size, plan.length);
assert.ok(plan.every(p => p.selectionScore >= 0 && p.selectionScore <= 100));
assert.ok(plan.some(p => p.subjectType === 'landscape'));
const decision = buildDirectorDecision(media, { creativePrompt:'fast cinematic motorcycle reel', maxShots:5 });
assert.equal(decision.version, 'universal-director-decision-v1');
assert.equal(decision.shotCount, 5);
assert.equal(decision.selectedMedia.length, 5);
console.log('director-coverage-planning: PASS');
