import fs from 'node:fs';
import assert from 'node:assert/strict';
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const enhancer=fs.readFileSync(new URL('../src/outputFormatEnhancer.jsx',import.meta.url),'utf8');
assert.match(main,/OutputFormatEnhancer/); assert.match(enhancer,/formatRenderedFilm/);
for(const id of ['portrait','square','landscape']) assert.match(enhancer,new RegExp(`data-output-format=\\"\\$\\{id\\}\\"`)) || assert.match(enhancer,new RegExp(`data-output-format=\\"${id}\\"`));
assert.match(enhancer,/OPTIONS=/); assert.match(enhancer,/downloadSocialFilm/); assert.match(enhancer,/shareSocialFilm/); assert.match(enhancer,/data-output-format/);
console.log('batch44-output-ui-integration: PASS');
