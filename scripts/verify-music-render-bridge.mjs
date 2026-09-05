import assert from 'node:assert/strict';
import { buildMusicRenderBridge, scoreMusicEditSync } from '../src/musicRenderBridge.js';
const bridge=buildMusicRenderBridge({prompt:'dark energetic cinematic reveal',duration:15,cuts:[{startTime:0,role:'hook'},{startTime:3.2,role:'action'},{startTime:10.1,role:'hero'}]});
assert.equal(bridge.renderAudio.enabled,true);assert.equal(bridge.renderAudio.originalOnly,true);assert.ok(bridge.renderAudio.beatGrid.length>0);assert.ok(bridge.timeline.length===3);assert.ok(scoreMusicEditSync(bridge)>=0&&scoreMusicEditSync(bridge)<=1);console.log('music-render-bridge: PASS');
