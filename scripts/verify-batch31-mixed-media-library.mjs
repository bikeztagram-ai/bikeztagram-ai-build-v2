import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const endpoint=fs.readFileSync(new URL('../api/analyse-library.js',import.meta.url),'utf8');
const upload=fs.readFileSync(new URL('../api/upload.js',import.meta.url),'utf8');
assert.match(app,/multiple onChange/);assert.match(app,/slice\(0,12\)/);assert.match(app,/\/api\/analyse-library/);assert.match(app,/mediaId:source\?\.id\|\|`source-\$\{sourceIndex\}`/);assert.match(app,/renderInspectImprove/);assert.match(app,/mediaItems:sources/);assert.match(endpoint,/sourceIndex/);assert.match(endpoint,/createPartFromUri/);assert.match(endpoint,/Maximum source-library size is 12/);assert.match(endpoint,/Motorcycles are not a special case/);assert.match(upload,/image\/jpeg/);assert.match(upload,/video\/mp4/);assert.match(upload,/maximumSizeInBytes/);
console.log('batch31-mixed-media-library: PASS');
