import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const upload=fs.readFileSync(new URL('../api/upload.js',import.meta.url),'utf8');
const imageAnalysis=fs.readFileSync(new URL('../api/analyse-image.js',import.meta.url),'utf8');

assert.match(app,/accept=\"video\/\*,image\/\*\"/);
assert.match(app,/\/api\/analyse-image/);
assert.match(app,/imageUrl:blob\.url/);
assert.match(app,/mediaId:worldBridge\?'world-fill-0':'source-0'/);
assert.match(app,/id:'source-0'/);
assert.match(app,/isImage/);
assert.match(upload,/image\/jpeg/);
assert.match(upload,/image\/png/);
assert.match(upload,/image\/webp/);
assert.match(imageAnalysis,/analysis\.mediaType = 'image'/);
assert.match(imageAnalysis,/universal-ai-filmmaker/);
assert.doesNotMatch(app,/requires video\. Universal image\/mixed-media intake remains/i);
assert.doesNotMatch(app,/motorcycleModel|ninja1000|kawasaki/i);

console.log('batch30-universal-image-intake: PASS');
