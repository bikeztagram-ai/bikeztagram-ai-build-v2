import fs from 'node:fs';
import assert from 'node:assert/strict';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const upload = fs.readFileSync('api/upload.js', 'utf8');

assert.match(String(pkg.dependencies?.['@vercel/blob'] || ''), /^\^?2\.8\./, 'Blob SDK must be on 2.8.x');
assert.match(upload, /handleUpload\(/);
assert.match(upload, /token,\s*body,/);
assert.match(upload, /multipart:\s*Boolean\(multipart\)/);
assert.match(upload, /maximumSizeInBytes:\s*500\s*\*\s*1024\s*\*\s*1024/);

console.log('Batch 75 legacy Blob route contract: PASS');
console.log('- @vercel/blob 2.8.x');
console.log('- server-side client-token route retained');
console.log('- multipart constraint retained');
console.log('- 500 MB application guard retained');
