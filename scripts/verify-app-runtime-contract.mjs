import fs from 'node:fs';
import assert from 'node:assert/strict';

const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
assert.match(app,/renderUniversalProduction/,'App must use the universal production renderer');
assert.doesNotMatch(app,/renderInspectImprove/,'App must not bypass the universal production renderer');
assert.match(app,/BUILD FINAL FILM \+ MUSIC/,'Filmmaker CTA must clearly include music');
assert.match(app,/mode==='music'/,'Music must be a separate studio mode');
assert.match(app,/No Gemini/,'UI must explicitly communicate the no-Gemini architecture');
assert.doesNotMatch(app,/URL\.createObjectURL\(f\)/,'Thumbnail rendering must not create object URLs during React render');
console.log('app-runtime-contract: PASS');
