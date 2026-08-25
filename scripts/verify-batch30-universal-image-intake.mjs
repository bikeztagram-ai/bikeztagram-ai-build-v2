import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const upload=fs.readFileSync(new URL('../api/upload.js',import.meta.url),'utf8');
const imageAnalysis=fs.readFileSync(new URL('../api/analyse-image.js',import.meta.url),'utf8');

assert.match(app,/accept=\"video\/\*,image\/\*\"/);
assert.match(app,/\/api\/analyse-image/);
assert.match(app,/if\(!data\.url\)throw new Error\(`Blob upload completed without a public URL/);
assert.match(app,/sourceUrl:data\.url,url:data\.url/);
assert.match(app,/id:`source-\$\{index\}`/);
assert.match(app,/type:file\.type/);
assert.match(app,/const source=sources\[sourceIndex\]\|\|sources\[0\]/);
assert.match(app,/mediaId:generated\?undefined:\(source\?\.id\|\|`source-\$\{sourceIndex\}`\)/);
assert.match(upload,/image\/jpeg/);
assert.match(upload,/image\/png/);
assert.match(upload,/image\/webp/);
assert.match(imageAnalysis,/analysis\.mediaType = 'image'/);
assert.match(imageAnalysis,/universal-ai-filmmaker/);
assert.doesNotMatch(app,/requires video\. Universal image\/mixed-media intake remains/i);
assert.doesNotMatch(app,/motorcycleModel|ninja1000|kawasaki/i);

console.log('batch30-universal-image-intake: PASS');
