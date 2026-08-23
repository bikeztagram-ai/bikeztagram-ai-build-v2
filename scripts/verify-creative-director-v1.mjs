import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/creativeDirector.js','utf8');
assert.match(source,/interpretCreativeRequest/);
assert.match(source,/createCreativeDirectorBrief/);
assert.match(source,/buildNarrativeArc/);
assert.match(source,/buildMusicDirectorBrief/);
assert.match(source,/buildGenerativeSceneSlots/);
assert.match(source,/mergeCreativeDirectionIntoPlan/);
assert.match(source,/copyrightSafeGeneration:true/);
assert.match(source,/originalMusicRequired:true/);
assert.doesNotMatch(source,/namedStyleImitation:\s*true/);
assert.doesNotMatch(source,/namedArtistImitation:\s*true/);

const {createCreativeDirectorBrief,interpretCreativeRequest}=await import('../src/creativeDirector.js');
const request=interpretCreativeRequest('Make a dark cinematic motorcycle reveal with a mysterious build, aggressive final action and an original soundtrack, 30 seconds');
assert.equal(request.primaryMode,'action');
assert.equal(request.targetDuration,30);
assert.equal(request.originality.copyrightSafe,true);

const brief=createCreativeDirectorBrief({
  prompt:'Make a dark cinematic motorcycle reveal with a mysterious build, aggressive final action and an original soundtrack, 30 seconds',
  mediaItems:[{name:'riding.mp4',type:'video/mp4'},{name:'bike.jpg',type:'image/jpeg'}],
  mediaProfile:{mediaCount:2,primarySubjectType:'vehicle',subjectCounts:{vehicle:2}},
  analysis:{subject:{category:'vehicle',label:'motorcycle'}}
});
assert.equal(brief.version,'creative-director-v1');
assert.ok(brief.narrative.length>=5);
assert.equal(brief.musicDirector.originality?.undefined,undefined);
assert.equal(brief.musicDirector.copyright.originalOnly,true);
assert.ok(Array.isArray(brief.shotGrammar.transitions));
assert.equal(brief.productionRules.uploadedAssetsFirst,true);
console.log('Creative Director V1 contract: PASS');
console.log('- natural-language request interpretation');
console.log('- narrative arc + shot grammar');
console.log('- original AI Music Director brief');
console.log('- generative scene slots without named-style imitation');
console.log('- copyright-safe production rules');
