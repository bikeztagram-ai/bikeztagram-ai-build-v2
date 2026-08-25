import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const exporter=fs.readFileSync(new URL('../src/socialExport.js',import.meta.url),'utf8');
const presets=fs.readFileSync(new URL('../src/outputPresets.js',import.meta.url),'utf8');

// Verify the current social-export contract and keep platform metadata in its source-of-truth module.
assert.match(app,/downloadSocialFilm/);
assert.match(app,/shareSocialFilm/);
assert.match(app,/getSocialExportInfo/);
assert.match(app,/async function exportFilm\(\)/);
assert.match(app,/async function shareFilm\(\)/);
assert.match(app,/presetId:'portrait'/);
assert.match(app,/setExportInfo\(/);
assert.match(exporter,/SOCIAL_PRESETS/);
assert.match(exporter,/OUTPUT_PRESETS/);
assert.match(exporter,/extension:'webm'/);
assert.match(exporter,/mimeType:'video\/webm'/);
assert.match(exporter,/navigator\.share/);
assert.match(exporter,/anchor\.download/);
assert.match(presets,/Instagram Reels/);
assert.match(presets,/TikTok/);
assert.match(presets,/YouTube Shorts/);
assert.match(presets,/width: 1080/);
assert.match(presets,/height: 1920/);

console.log('batch33-social-export: PASS');
