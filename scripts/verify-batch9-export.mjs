import assert from 'node:assert/strict';
import fs from 'node:fs';

const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const exporter = fs.readFileSync(new URL('../src/exportTools.js', import.meta.url), 'utf8');

assert.match(main, /import ['"]\.\/exportTools\.js['"]/);
assert.match(exporter, /download\.download/);
assert.match(exporter, /Download video/);
assert.match(exporter, /__bikeztagramLastAutoQA/);
assert.match(exporter, /blob:/);

console.log('batch9-export: PASS');
