import assert from 'node:assert/strict';
import {createMusicCompositionSpec,normaliseMusicStructure,buildMusicEventPlan} from '../src/ownedMusicComposerControlV1.js';
const spec=createMusicCompositionSpec({prompt:'dark cinematic trailer',duration:30,dropTimes:[12,24],structure:[{type:'intro',duration:6},{type:'build',duration:6},{type:'drop',duration:8},{type:'finale',duration:10}]});
assert.equal(spec.requirements.original,true);const sections=normaliseMusicStructure(spec.structure,spec.duration);assert.equal(sections[1].start,6);const events=buildMusicEventPlan({sections,dropTimes:spec.dropTimes});assert.ok(events.events.some(e=>e.type==='drop'&&e.time===12));console.log('Owned music composer control V1 verification passed');
