import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const universal=fs.readFileSync(new URL('../src/universalMediaClient.js',import.meta.url),'utf8');
assert.doesNotMatch(app,/['"]\/api\/render['"]/);
assert.doesNotMatch(universal,/['"]\/api\/render['"]/);
assert.match(app,/\/api\/analyse/);
assert.match(app,/renderInspectImprove/);
console.log('release-routing: PASS');
