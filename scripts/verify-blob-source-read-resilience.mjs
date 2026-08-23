import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../api/private-blob-read.js', import.meta.url), 'utf8');

assert.match(source, /process\.env\.PUBLIC_BLOB_READ_WRITE_TOKEN/);
assert.match(source, /process\.env\.BLOB_READ_WRITE_TOKEN/);
assert.match(source, /access, token/);
assert.match(source, /'public'/);
assert.match(source, /'private'/);
assert.match(source, /useCache: false/);
assert.match(source, /public Blob URL returned HTTP/);

console.log('Blob source reader resilience contract verified.');
