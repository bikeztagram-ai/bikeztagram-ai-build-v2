import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OUTPUT_PRESETS, resolveOutputPreset, outputPlanFields } from '../src/outputPresets.js';

const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
for (const token of ['universal filmmaker','DIRECT MY FILM','Your media','Direct your film','AI film plan','Finished film','Auto captions','Export rhythm map']) assert.match(app,new RegExp(token.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&'),'i'));
assert.match(css,/app-container/); assert.match(css,/hero-panel/); assert.match(css,/workspace-grid/); assert.match(css,/glass-card/); assert.match(css,/dropzone/); assert.match(css,/primary-cta/); assert.match(css,/shot-rail/); assert.match(css,/film-preview/); assert.match(css,/@media\(max-width:800px\)/); assert.match(css,/@media\(max-width:480px\)/);
assert.match(app,/async function exportFilm\(\)/); assert.match(app,/async function shareFilm\(\)/); assert.match(app,/async function world\(\)/); assert.match(app,/onClick=\{analyse\}/); assert.match(app,/onClick=\{render\}/);
assert.deepEqual([OUTPUT_PRESETS.portrait.width,OUTPUT_PRESETS.portrait.height],[1080,1920]);
assert.deepEqual([OUTPUT_PRESETS.square.width,OUTPUT_PRESETS.square.height],[1080,1080]);
assert.deepEqual([OUTPUT_PRESETS.landscape.width,OUTPUT_PRESETS.landscape.height],[1920,1080]);
assert.equal(resolveOutputPreset('', 'Make a 16:9 landscape YouTube film').id,'landscape'); assert.equal(resolveOutputPreset('', 'Create a square feed post').id,'square'); assert.equal(resolveOutputPreset('', 'Create a cinematic social reel').id,'portrait');
assert.deepEqual(outputPlanFields('landscape'),{outputPreset:'landscape',outputWidth:1920,outputHeight:1080,outputAspectRatio:'16:9'});
console.log('batch39-premium-ui + batch40-output-contract: PASS');
