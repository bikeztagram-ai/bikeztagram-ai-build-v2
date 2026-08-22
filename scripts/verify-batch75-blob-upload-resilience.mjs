import fs from 'node:fs';
import assert from 'node:assert/strict';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const app = fs.readFileSync('src/App.jsx', 'utf8');
const upload = fs.readFileSync('api/upload.js', 'utf8');

assert.equal(pkg.dependencies?.['@vercel/blob'], '2.6.1', 'Blob SDK must remain pinned to the known-good 2.6.1 baseline');
assert.match(app, /handleUploadUrl:\s*['"]\/api\/upload['"]/);
assert.match(app, /multipart:\s*false/);
assert.doesNotMatch(app, /multipart:\s*useMultipart/);
assert.doesNotMatch(app, /const\s+useMultipart\s*=/);
assert.match(app, /onUploadProgress:/);
assert.match(upload, /handleUpload\(/);
assert.match(upload, /multipart:\s*Boolean\(multipart\)/);
assert.match(upload, /maximumSizeInBytes:\s*500\s*\*\s*1024\s*\*\s*1024/);

console.log('Batch 75 Blob upload regression contract: PASS');
console.log('- @vercel/blob pinned to known-good 2.6.1');
console.log('- direct client upload route preserved');
console.log('- multipart upload disabled in client path');
console.log('- automatic multipart switching absent');
console.log('- upload progress reporting preserved');
console.log('- 500 MB server application guard preserved');
