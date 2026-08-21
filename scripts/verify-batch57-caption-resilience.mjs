import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
assert.match(app,/requestJson\('\/api\/captions'/);
assert.match(app,/timeoutMs:120000/);
assert.match(app,/attempts:3/);
assert.match(app,/Caption analysis unavailable/);
console.log('batch57-caption-resilience: PASS');
