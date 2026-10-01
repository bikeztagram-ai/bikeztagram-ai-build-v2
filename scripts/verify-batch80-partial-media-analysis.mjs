import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('src/App.jsx','utf8');
assert.match(app,/mapWithConcurrency\(sources/);
assert.match(app,/const successful=analysisResults\.filter\(result=>result\.ok\)/);
assert.match(app,/if\(!successful\.length\)/);
assert.match(app,/analysisWarnings:failed/);
assert.match(app,/Skipped \$\{failed\.length\} source/);
console.log('Batch 80 partial media analysis resilience: PASS');
