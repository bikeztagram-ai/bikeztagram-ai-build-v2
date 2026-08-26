import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../api/private-blob-read.js', import.meta.url), 'utf8');

assert.match(source, /process\.env\.PUBLIC_BLOB_READ_WRITE_TOKEN/);
assert.doesNotMatch(source, /process\.env\.BLOB_READ_WRITE_TOKEN/);
assert.match(source, /access: 'public'/);
assert.doesNotMatch(source, /access, token/);
assert.doesNotMatch(source, /access: 'private'/);
assert.match(source, /useCache: false/);
assert.match(source, /public Blob URL returned HTTP/);
assert.match(source, /Canonical public Vercel Blob could not read/);

console.log('Canonical public Blob source reader contract verified.');
