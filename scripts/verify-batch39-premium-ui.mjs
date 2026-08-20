import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

for (const token of ['Universal AI filmmaker','DIRECT MY FILM','Your media','Direct your film','AI film plan','Finished film','Auto captions','Export rhythm map']) assert.match(app,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
for (const token of ['app-container','hero-panel','workspace-grid','glass-card','dropzone','primary-cta','shot-rail','film-preview','@media(max-width:800px)','@media(max-width:480px)']) assert.match(css,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(app,/async function exportFilm\(\)/);
assert.match(app,/async function shareFilm\(\)/);
assert.match(app,/async function world\(\)/);
assert.match(app,/onClick=\{analyse\}/);
assert.match(app,/onClick=\{render\}/);
console.log('batch39-premium-ui: PASS');
