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

// Keep this contract focused on behaviour rather than exact quote/formatting.
// The builder is allowed to refactor App.jsx without breaking the Blob safety
// gate, provided the required upload/read boundaries remain intact.
const blobPresignRoute = /fetch\(\s*['\"]\/api\/blob-presign['\"]\s*/;
const xhrPut = /xhr\.open\(\s*['\"]PUT['\"]/;
const xhrUpload = /XMLHttpRequest/;
const clientTokenUploader = /from\s*['\"]@vercel\/blob\/client['\"]/;

assert.match(String(pkg.dependencies?.['@vercel/blob'] || ''), /^\^?2\.8\./, 'Blob SDK must be on 2.8.x');
assert.match(presign, /issueSignedToken/);
assert.match(presign, /operations:\s*\[\s*["']put["']\s*\]/);
assert.match(presign, /operations:\s*\[\s*["']get["']\s*\]/);
assert.match(presign, /presignUrl/);
assert.match(presign, /operation:\s*["']put["']/);
assert.match(presign, /operation:\s*["']get["']/);
assert.match(presign, /validUntil/);
assert.match(presign, /500\s*\*\s*1024\s*\*\s*1024/);

assert.match(app, blobPresignRoute, 'App must request uploads through /api/blob-presign');
assert.match(app, xhrUpload, 'App must use XMLHttpRequest for direct Blob upload');
assert.match(app, xhrPut, 'App must upload media with a signed PUT request');
assert.doesNotMatch(app, clientTokenUploader, 'App must not use the CORS-prone client-token uploader');

assert.match(privateRead, /from\s*['\"]@vercel\/blob['\"]/i, 'Private read helper must use the Vercel Blob SDK');
assert.match(privateRead, /get\(resolvedPathname,\s*\{\s*access:\s*["']private["']/i, 'Private reads must use authenticated SDK get()');
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
