import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const presign=read('api/blob-presign.js');
const blobRead=read('api/private-blob-read.js');
const analyse=read('api/analyse.js');
const analyseLibrary=read('api/analyse-library.js');
const analyseImage=read('api/analyse-image.js');
const app=read('src/App.jsx');
const music=read('src/musicGenerator.js');
const composition=read('src/musicCompositionV3.js');
const runtime=read('src/videoGenerationRuntimeV2.js');
const bridge=read('src/creativeEngineMediaBridgeV2.js');

// Protected Blob contract: one canonical private credential, never the legacy PUBLIC token.
assert.match(presign,/process\.env\.BLOB_READ_WRITE_TOKEN/,'Blob signing must use canonical BLOB_READ_WRITE_TOKEN');
assert.doesNotMatch(presign,/process\.env\.PUBLIC_BLOB_READ_WRITE_TOKEN/,'Protected Blob signer must not regress to PUBLIC_BLOB_READ_WRITE_TOKEN');
assert.match(presign,/operation:\s*"put"/);
assert.match(presign,/operation:\s*"get"/);
assert.match(presign,/access:\s*"private"/);
assert.match(presign,/addRandomSuffix:\s*false/);
assert.match(blobRead,/get\(/,'Server media reader must use authenticated Blob SDK access');
assert.match(blobRead,/['"]private['"]/,'Server media reader must retain private access path');
assert.match(blobRead,/BLOB_READ_WRITE_TOKEN/,'Server media reader must retain canonical Blob credential');

// Protected Gemini boundary: actual media endpoints remain server-side and receive source URLs/pathnames.
for(const source of [analyse,analyseLibrary,analyseImage]){
  assert.match(source,/process\.env\.GEMINI_API_KEY|GoogleGenAI|GoogleGenerativeAI/,'Gemini endpoint must retain server-side Gemini boundary');
}
assert.match(app,/\/api\/analyse-library/,'App must retain mixed-media Gemini analysis endpoint');
assert.match(app,/\/api\/analyse-image|\/api\/analyse/,'App must retain single-media Gemini analysis endpoint');
assert.match(app,/\/api\/production-plan/,'App must retain production-plan handoff');

// Next checkpoint: real original audio must be generated locally when provider audio is unavailable.
assert.match(music,/createOriginalMusicWav/,'Music runtime must retain audible local original fallback');
assert.match(music,/audioAvailable:true/,'Music fallback must advertise usable audio');
assert.match(composition,/providerRequest|providerNeutral/,'Music composition must retain provider-neutral upgrade path');
assert.match(composition,/originalOnly:true/,'Music generation must remain originality constrained');

// Next checkpoint: generated scenes must be representable and materialised into the renderer plan.
assert.match(bridge,/generated/,'Creative media bridge must retain generated-scene handling');
assert.match(runtime,/text-to-video|image-to-video|subject-aware/,'Video runtime must retain provider-neutral generation modes');
assert.match(runtime,/originalOnly/,'Generated video requests must retain originality constraints');

console.log('Protected foundation + next checkpoint contract: PASS');
console.log('- private Blob credential/access contract locked');
console.log('- Gemini server boundary retained');
console.log('- audible original music fallback retained');
console.log('- provider-neutral music upgrade path retained');
console.log('- generated-scene/video runtime retained');
console.log('- app still routes real media into Gemini and production planning');
