import fs from 'node:fs';
import assert from 'node:assert/strict';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const app = fs.readFileSync('src/App.jsx', 'utf8');
const presign = fs.readFileSync('api/blob-presign.js', 'utf8');
const privateRead = fs.readFileSync('api/private-blob-read.js', 'utf8');
const analyse = fs.readFileSync('api/analyse.js', 'utf8');
const analyseImage = fs.readFileSync('api/analyse-image.js', 'utf8');
const analyseLibrary = fs.readFileSync('api/analyse-library.js', 'utf8');
const captions = fs.readFileSync('api/captions.js', 'utf8');

assert.match(String(pkg.dependencies?.['@vercel/blob'] || ''), /^\^?2\.8\./, 'Blob SDK must be on 2.8.x');
assert.match(presign, /issueSignedToken/);
assert.match(presign, /operations:\s*\["put",\s*"get"\]/);
assert.match(presign, /presignUrl/);
assert.match(presign, /operation:\s*"put"/);
assert.match(presign, /operation:\s*"get"/);
assert.match(presign, /validUntil/);
assert.match(presign, /addRandomSuffix:\s*false/, 'Presigned PUT must keep the pathname stable for the following GET');
assert.match(presign, /500\s*\*\s*1024\s*\*\s*1024/);
assert.match(app, /fetch\('\/api\/blob-presign'/);
assert.match(app, /XMLHttpRequest/);
assert.match(app, /xhr\.open\('PUT'/);
assert.doesNotMatch(app, /from '@vercel\/blob\/client'/, 'App must not use the CORS-prone client-token uploader');

assert.match(privateRead, /from '@vercel\/blob'/, 'Source reader must use the Vercel Blob SDK fallback');
assert.match(privateRead, /pathnameFromBlobUrl/, 'Source reader must recover pathname from signed Blob URLs');
assert.match(privateRead, /new Response\(result\.stream\)\.arrayBuffer/, 'Source reader must consume the Blob stream');

for (const [name, source] of Object.entries({analyse, analyseImage, analyseLibrary, captions})) {
  assert.match(source, /private-blob-read\.js/, `${name} must use the central Blob source reader`);
}

console.log('Signed Blob upload/read contract: PASS');
console.log('- time-bound signed PUT + GET delegation');
console.log('- deterministic pathname (no random suffix after presigning)');
console.log('- browser-to-Blob direct transfer');
console.log('- XMLHttpRequest upload progress');
console.log('- 500 MB application guard');
console.log('- central source reader for Gemini/captions');
