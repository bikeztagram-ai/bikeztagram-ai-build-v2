import assert from 'node:assert/strict';
import {buildEditorialAudioMap,snapTimeToBeat,chooseVisualEventTargets,buildAudioAnalysisRequest} from '../src/creativeAudioAnalysisV2.js';
const map=buildEditorialAudioMap({duration:15,bpm:128,beats:[0,.46875,.9375,1.40625,1.875,2.34375,2.8125,3.28125,3.75,4.21875,4.6875,5.15625,5.625,6.09375],sections:[{id:'intro',start:0},{id:'main',start:4}],drops:[{time:6.1,kind:'major-drop',strength:1}],energyEvents:[{time:3.9,type:'riser',strength:.8}]});
assert.equal(map.version,'editorial-audio-map-v2');
assert.equal(map.measuredAudio,false);
assert.equal(snapTimeToBeat(6.1,map),6.09375);
assert.ok(chooseVisualEventTargets(map).length>=3);
assert.equal(buildAudioAnalysisRequest({audioRef:'track-1'}).features.beats,true);
console.log('Creative audio analysis V2 verification passed');
