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
assert.match(presign, /operations:\s*\["put"\]/);
assert.match(presign, /operations:\s*\["get"\]/);
assert.match(presign, /presignUrl/);
assert.match(presign, /operation:\s*"put"/);
assert.match(presign, /operation:\s*"get"/);
assert.match(presign, /validUntil/);
assert.match(presign, /500\s*\*\s*1024\s*\*\s*1024/);
assert.match(app, /fetch\('\/api\/blob-presign'/);
assert.match(app, /XMLHttpRequest/);
assert.match(app, /xhr\.open\('PUT'/);
assert.doesNotMatch(app, /from '@vercel\/blob\/client'/, 'App must not use the CORS-prone client-token uploader');

assert.match(privateRead, /from '@vercel\/blob'/, 'Private read helper must use the Vercel Blob SDK');
assert.match(privateRead, /get\(resolvedPathname,\s*\{\s*access:\s*'private'/, 'Private reads must use authenticated SDK get()');
assert.match(privateRead, /pathnameFromBlobUrl/, 'Private read helper must recover pathname from signed Blob URLs');
assert.match(privateRead, /new Response\(result\.stream\)\.arrayBuffer/, 'Private read helper must consume the Blob stream');

for (const [name, source] of Object.entries({analyse, analyseImage, analyseLibrary, captions})) {
  assert.match(source, /private-blob-read\.js/, `${name} must use the private Blob read helper`);
  assert.doesNotMatch(source, /await fetch\(actual(Video|Image)Url\)/, `${name} must not directly fetch private Blob media`);
  assert.doesNotMatch(source, /await fetch\(url\)/, `${name} must not directly fetch private Blob media`);
}

console.log('Batch 76 signed Blob upload/read contract: PASS');
console.log('- time-bound signed PUT URL');
console.log('- time-bound signed GET URL for client-side access');
console.log('- authenticated server-side private Blob SDK reads');
console.log('- browser-to-Blob direct transfer');
console.log('- XMLHttpRequest upload progress');
console.log('- 500 MB application guard');
console.log('- client-token retry loop removed');
