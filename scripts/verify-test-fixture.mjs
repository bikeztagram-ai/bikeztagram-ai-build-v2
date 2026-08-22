import assert from 'node:assert/strict';
export const fixture={prompt:'Create a dark cinematic reveal with a powerful original soundtrack. Build mystery, anticipation, reveal, escalation and a hero ending. Use the strongest shots, varied motion and beat-aware cuts.',media:[
 {mediaIndex:0,type:'image',qualityScore:95,directorSelectionScore:100},
 {mediaIndex:1,type:'video',qualityScore:92,directorSelectionScore:96},
 {mediaIndex:2,type:'image',qualityScore:88,directorSelectionScore:90},
 {mediaIndex:3,type:'video',qualityScore:91,directorSelectionScore:87},
 {mediaIndex:4,type:'image',qualityScore:94,directorSelectionScore:85}
]};
assert.equal(fixture.media.length,5); assert.ok(fixture.prompt.includes('original soundtrack'));
console.log('Deterministic test fixture: PASS');
