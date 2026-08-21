import assert from 'node:assert/strict';
import {CAPABILITIES,capabilityRequirements,providerSatisfies} from '../src/generationCapabilityCatalogV1.js';
assert.ok(CAPABILITIES.video.includes('character-action'));assert.ok(CAPABILITIES.music.includes('music-event-analysis'));const req=capabilityRequirements({type:'image-to-video',audio:{generate:true}});assert.deepEqual(req,['image-to-video','text-to-music']);assert.equal(providerSatisfies({capabilities:req},req),true);console.log('Generation capability catalog V1 verification passed');
