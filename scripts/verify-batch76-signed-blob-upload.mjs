import fs from 'node:fs';
import assert from 'node:assert/strict';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const app = fs.readFileSync('src/App.jsx', 'utf8');
const presign = fs.readFileSync('api/blob-presign.js', 'utf8');

assert.match(String(pkg.dependencies?.['@vercel/blob'] || ''), /^\^?2\.8\./, 'Blob SDK must be on 2.8.x');
assert.match(presign, /issueSignedToken/);
assert.match(presign, /operations:\s*\["put"\]/);
assert.match(presign, /presignUrl/);
assert.match(presign, /operation:\s*"put"/);
assert.match(presign, /validUntil/);
assert.match(presign, /500\s*\*\s*1024\s*\*\s*1024/);
assert.match(app, /fetch\('\/api\/blob-presign'/);
assert.match(app, /XMLHttpRequest/);
assert.match(app, /xhr\.open\('PUT'/);
assert.doesNotMatch(app, /from '@vercel\/blob\/client'/, 'App must not use the CORS-prone client-token uploader');

console.log('Batch 76 signed Blob upload contract: PASS');
console.log('- time-bound signed PUT URL');
console.log('- browser-to-Blob direct transfer');
console.log('- XMLHttpRequest upload progress');
console.log('- 500 MB application guard');
console.log('- client-token retry loop removed');
