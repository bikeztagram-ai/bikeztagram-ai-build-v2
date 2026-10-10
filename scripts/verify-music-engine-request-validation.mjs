import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../api/music-engine.js', import.meta.url), 'utf8');
const getHandler = source.indexOf("if (req.method === 'GET')");
const postHandler = source.indexOf("if (req.method !== 'POST')", getHandler);
assert.ok(getHandler >= 0 && postHandler > getHandler, 'music engine must expose GET status and POST submit handlers');
const getSource = source.slice(getHandler, postHandler);
assert.match(getSource, /const requestedJobId = new URL\(req\.url,[\s\S]*?\.searchParams\.get\('jobId'\)/);
assert.match(getSource, /if \(!requestedJobId \|\| !requestedJobId\.trim\(\)\)[\s\S]*?return json\(res, 400, \{ error: 'jobId is required\.' \}\)/);
assert.ok(
  getSource.indexOf('if (!requestedJobId') < getSource.indexOf('const jobId = cleanJobId(requestedJobId)'),
  'GET must reject a missing ID before the POST-oriented ID sanitizer can generate one'
);
console.log('PASS: Music Engine rejects missing GET jobId before sanitisation.');
