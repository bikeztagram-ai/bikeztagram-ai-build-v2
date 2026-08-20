import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const exporter=fs.readFileSync(new URL('../src/socialExport.js',import.meta.url),'utf8');

assert.match(app,/downloadSocialFilm/);
assert.match(app,/shareSocialFilm/);
assert.match(app,/getSocialExportInfo/);
assert.match(app,/Download Finished Film/);
assert.match(app,/9:16 portrait/);
assert.match(app,/1080×1920/);
assert.match(exporter,/SOCIAL_PRESETS/);
assert.match(exporter,/1080/);
assert.match(exporter,/1920/);
assert.match(exporter,/navigator\.share/);
assert.match(exporter,/anchor\.download/);
assert.match(exporter,/video\/webm/);

console.log('batch33-social-export: PASS');
