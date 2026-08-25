import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const exporter=fs.readFileSync(new URL('../src/socialExport.js',import.meta.url),'utf8');

// Verify the current social-export contract rather than stale UI wording.
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
assert.match(exporter,/Instagram Reels/);
assert.match(exporter,/TikTok/);
assert.match(exporter,/YouTube Shorts/);

console.log('batch33-social-export: PASS');
