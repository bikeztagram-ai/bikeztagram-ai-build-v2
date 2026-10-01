import assert from 'node:assert/strict';
import fs from 'node:fs';
const pool=fs.readFileSync('src/asyncPool.js','utf8');
const app=fs.readFileSync('src/App.jsx','utf8');
assert.match(pool,/onProgress/);
assert.match(pool,/completed \+= 1/);
assert.match(pool,/completed, total: values\.length, index, ok/);
assert.match(app,/Analysing media locally\.\.\. \$\{completed\}\/\$\{total\}/);
console.log('Media analysis progress contract: PASS');
