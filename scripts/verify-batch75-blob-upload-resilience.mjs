import fs from 'node:fs';
import assert from 'node:assert/strict';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const app = fs.readFileSync('src/App.jsx', 'utf8');
const upload = fs.readFileSync('api/upload.js', 'utf8');

assert.match(String(pkg.dependencies?.['@vercel/blob'] || ''), /^\^?2\.8\./, 'Blob SDK must be on 2.8.x');
assert.match(app, /handleUploadUrl:\s*['"]\/api\/upload['"]/);
assert.match(app, /multipart:\s*useMultipart/);
assert.match(app, /onUploadProgress:/);
assert.match(upload, /handleUpload\(/);
assert.match(upload, /multipart:\s*Boolean\(multipart\)/);
assert.match(upload, /maximumSizeInBytes:\s*500\s*\*\s*1024\s*\*\s*1024/);

console.log('Batch 75 Blob upload resilience contract: PASS');
console.log('- @vercel/blob 2.8.x');
console.log('- direct client upload route');
console.log('- multipart large-file path');
console.log('- upload progress reporting');
console.log('- 500 MB application guard');
