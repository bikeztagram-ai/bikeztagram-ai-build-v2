import assert from 'node:assert/strict';
import {composeScene,splitStoryIntoScenes,buildSceneSequence} from '../src/universalSceneComposerV1.js';
const s=composeScene({idea:'A robot discovers an ancient underwater city',duration:6,subjects:[{id:'robot'}],environment:{location:'underwater city'},action:{event:'discover'}});
assert.equal(s.version,'universal-scene-spec-v1');assert.equal(s.continuity.subjectIds[0],'robot');assert.equal(s.generation.allowTextToVideo,true);
const scenes=buildSceneSequence(splitStoryIntoScenes({story:[{id:'a',duration:3},{id:'b',duration:4}]}));assert.equal(scenes[1].start,3);assert.equal(scenes[1].order,1);
console.log('Universal scene composer V1 verification passed');
