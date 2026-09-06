import assert from 'node:assert/strict';
import { buildRenderCue, sourceTimeAtProgress } from '../src/cinematicRuntime.js';
import { buildDirectorDecision } from '../src/director.js';

const media=[
 {name:'motorcycle-action.mp4',type:'video/mp4',duration:8,cinematicScore:92,visualQuality:{detail:.9,contrast:.8},bestMoments:[{motionScore:.9,score:95}]},
 {name:'sunset-hero.jpg',type:'image/jpeg',width:1920,height:1080,cinematicScore:88,visualQuality:{detail:.85,contrast:.75}}
];
const decision=buildDirectorDecision(media,{creativePrompt:'cinematic motorcycle action reveal',maxShots:2});
assert.equal(decision.shotCount,2);
assert.equal(decision.coverage[0].mediaIndex,0);
const cue=buildRenderCue({id:'test',mediaId:'m0',startTime:1,duration:3,speed:1,speedEnd:1.5,motionStyle:'slow-push',transition:'hard-cut'},0,1);
assert.equal(cue.motion,'slow-push');
assert.equal(cue.speedEnd,1.5);
assert.ok(Number.isFinite(cue.sourceTimeAtProgress));
assert.ok(cue.sourceTimeAtProgress>cue.sourceStart);
assert.equal(sourceTimeAtProgress({sourceStart:2,sourceDuration:4,progress:0,speed:1,speedEnd:2}),2);
console.log('Director evidence -> runtime cue contract: PASS');
