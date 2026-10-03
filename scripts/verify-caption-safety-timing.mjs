import assert from 'node:assert/strict';
import {filterCaptionCues,normaliseCaptionTiming,applySpeechCaptionsToPlan} from '../src/captionPlanner.js';
const cues=filterCaptionCues([{text:'  Hello world  ',confidence:.9,start:-2,end:-1},{text:'',confidence:1},{text:'low confidence',confidence:.2},{text:'x'.repeat(100),confidence:.8}],{minimumConfidence:.55,maxChars:20});
assert.equal(cues.length,2); assert.equal(cues[0].text,'Hello world'); assert.equal(cues[1].text.length,20);
const timing=normaliseCaptionTiming([{text:'a',start:-4,end:-5},{text:'b',start:2,end:2}]);
assert.ok(timing.every(c=>c.start>=0&&c.end>c.start&&c.duration>=.05));
const result=applySpeechCaptionsToPlan({cuts:[{startTime:0,duration:2},{startTime:2,duration:2}]},[
{text:'first',confidence:.9,start:-1,end:1},{text:'second',confidence:.9,start:2,end:4}
],{minimumConfidence:.55});
assert.equal(result.appliedCount,2); assert.equal(result.plan.cuts[0].text,'first'); assert.equal(result.plan.cuts[1].text,'second');
console.log('CAPTION SAFETY/TIMING HARDENING PASS');