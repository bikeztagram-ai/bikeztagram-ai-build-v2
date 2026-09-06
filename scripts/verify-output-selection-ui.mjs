import fs from 'node:fs';
import assert from 'node:assert/strict';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
assert.match(app,/outputPreset/,'App should carry an explicit output preset through the render plan');
assert.match(app,/portrait|square|landscape|story|cinema/,'App should expose or resolve supported output formats');
console.log('output-selection-ui: PASS');
