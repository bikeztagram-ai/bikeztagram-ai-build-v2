import fs from 'node:fs';
import assert from 'node:assert/strict';
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const enhancer=fs.readFileSync(new URL('../src/outputFormatEnhancer.jsx',import.meta.url),'utf8');
assert.match(main,/OutputFormatEnhancer/); assert.match(enhancer,/formatRenderedFilm/); assert.match(enhancer,/OPTIONS=/); assert.match(enhancer,/portrait/); assert.match(enhancer,/square/); assert.match(enhancer,/landscape/); assert.match(enhancer,/data-output-format/); assert.match(enhancer,/downloadSocialFilm/); assert.match(enhancer,/shareSocialFilm/);
console.log('batch44-output-ui-integration: PASS');
