import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const legacy=fs.readFileSync(new URL('../api/render.js',import.meta.url),'utf8');
assert.match(app,/\/api\/analyse/);
assert.doesNotMatch(app,/fetch\(['"]\/api\/render['"]/);
assert.match(legacy,/export default async function handler/);
console.log('batch70-routing-guard: PASS');
