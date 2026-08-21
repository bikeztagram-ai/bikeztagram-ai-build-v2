import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../src/mediaAnalysisClient.js',import.meta.url),'utf8');
assert.match(code,/requestJson/);
assert.match(code,/\/api\/analyse-media/);
assert.match(code,/imageUrl/);
assert.match(code,/videoUrl/);
assert.match(code,/universal analysis/);
console.log('batch61-media-analysis-contract: PASS');
