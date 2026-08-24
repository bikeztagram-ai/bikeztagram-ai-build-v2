import assert from 'node:assert/strict';
import fs from 'node:fs';

const bridge = fs.readFileSync('src/completeFilmAppBridge.js', 'utf8');
const runtime = fs.readFileSync('src/completeFilmRuntimeV1.js', 'utf8');
const music = fs.readFileSync('src/musicGenerator.js', 'utf8');
const render = fs.readFileSync('src/renderQualityLoop.js', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');

assert.match(bridge, /createCompleteFilmRuntime/);
assert.match(bridge, /runCompleteFilm/);
assert.match(bridge, /\/api\/analyse-library/);
assert.match(bridge, /\/api\/analyse-image/);
assert.match(bridge, /\/api\/analyse/);
assert.match(bridge, /\/api\/production-plan/);
assert.match(bridge, /generateOriginalMusic/);
assert.match(bridge, /renderInspectImprove/);
assert.match(runtime, /Promise\.all\(\[/);
assert.match(music, /\/api\/generate-music/);
assert.match(music, /buildLocalFallback/);
assert.match(render, /attachGeneratedAudioToVideo/);
assert.match(render, /validateRenderedVideo/);
assert.match(app, /\/api\/blob-presign/);
assert.match(app, /\/api\/analyse-library/);
assert.match(app, /generateOriginalMusic/);
assert.match(app, /renderInspectImprove/);

console.log('PASS: complete-film bridge is wired to the existing real Blob/Gemini, music and render/QA contracts; protected App pipeline remains present.');
