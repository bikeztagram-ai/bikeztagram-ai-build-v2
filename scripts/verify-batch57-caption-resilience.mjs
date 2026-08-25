import fs from 'node:fs';
import assert from 'node:assert/strict';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
assert.match(app,/fetch\('\/api\/captions'/);
assert.match(app,/method:'POST'/);
assert.match(app,/videoUrl:item\.url/);
assert.match(app,/Caption analysis unavailable; continuing without captions/);
assert.match(app,/catch\(err\)/);
console.log('batch57-caption-resilience: PASS');
