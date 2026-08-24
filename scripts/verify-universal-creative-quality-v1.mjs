import assert from 'node:assert/strict';
import { scoreCreativeOutput, buildProfessionalMusicRequest } from '../src/creativeQualityGateV1.js';

const request = buildProfessionalMusicRequest({ prompt: 'original cinematic song for a travel film', filmType: 'song' });
assert.equal(request.finalMasterRequired, true);
assert.equal(request.requirements.songLevelArrangement, true);
assert.equal(request.requirements.chorus, true);
assert.equal(request.requirements.mastering, true);
assert.equal(request.requirements.noNamedSongImitation, true);

const result = scoreCreativeOutput({
  prompt: 'cinematic travel film',
  media: [{ description: 'mountain landscape and road' }],
  cuts: [
    { mediaId: 'a', role: 'hook', shotType: 'wide', description: 'establishing landscape' },
    { mediaId: 'b', role: 'story-beat', shotType: 'medium', description: 'traveller moving through landscape' },
    { mediaId: 'c', role: 'reveal', shotType: 'close-up', description: 'detail of the journey' },
    { mediaId: 'd', role: 'action', shotType: 'action', description: 'moving through the city' },
    { mediaId: 'e', role: 'hero-ending', shotType: 'wide', description: 'hero landscape finale' }
  ],
  music: {
    audioAvailable: true,
    finalMaster: true,
    generationModel: 'professional-provider',
    sections: [{}, {}, {}, {}, {}],
    composition: {
      arrangement: { structure: true, motif: true, harmony: true, dynamics: true, rhythm: true, variation: true, mix: true, master: true }
    },
    beatGrid: [0, 1],
    editSync: true
  },
  generatedScenes: [{ originality: { originalOnly: true }, subjectContinuity: true }]
});
assert.equal(result.subject, 'travel');
assert.equal(result.pass, true);
assert.ok(result.audio >= 80);
assert.ok(result.visual >= 80);

console.log('Universal creative quality + professional music gate verification passed.');
