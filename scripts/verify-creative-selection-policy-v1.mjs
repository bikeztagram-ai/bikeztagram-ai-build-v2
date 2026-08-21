import assert from 'node:assert/strict';
import {rankCreativeCandidates} from '../src/creativeSelectionPolicyV1.js';
const r=rankCreativeCandidates([{id:'a',scores:{promptFidelity:100,subjectConsistency:100}},{id:'b',scores:{promptFidelity:80,subjectConsistency:95,motionQuality:95,visualQuality:95,story:95,musicImpact:95,continuity:95}}]);assert.equal(r[0].id,'b');console.log('Creative selection policy V1 verification passed');
