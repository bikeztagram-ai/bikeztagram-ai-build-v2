import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const mustExist = (path) => { assert.ok(fs.existsSync(new URL(`../${path}`, import.meta.url)), `Missing required release file: ${path}`); };

const requiredFiles = [
  'index.html',
  'public/manifest.webmanifest',
  'src/main.jsx',
  'src/App.jsx',
  'src/directorSelection.js',
  'src/timelineDirector.js',
  'src/captionPlanner.js',
  'src/musicGenerator.js',
  'src/apiRequest.js',
  'src/finalAudioMux.js',
  'src/renderAudioBridge.js',
  'src/renderQualityLoop.js',
  'src/socialExport.js',
  'src/outputFormatEnhancer.jsx',
  'api/analyse-media.js',
  'api/generate-music.js',
  'vercel.json',
];
requiredFiles.forEach(mustExist);

const app = read('src/App.jsx');
const index = read('index.html');
const manifest = read('public/manifest.webmanifest');
const main = read('src/main.jsx');
const director = read('src/directorSelection.js');
const timeline = read('src/timelineDirector.js');
const captions = read('src/captionPlanner.js');
const music = read('src/musicGenerator.js');
const musicApi = read('api/generate-music.js');
const request = read('src/apiRequest.js');
const qa = read('src/renderQualityLoop.js');
const social = read('src/socialExport.js');
const formats = read('src/outputFormatEnhancer.jsx');
const analysis = read('src/mediaAnalysisClient.js');
const vercel = read('vercel.json');

// PWA/browser shell: the manifest referenced by index.html must actually ship.
assert.match(index, /manifest\.webmanifest/);
assert.match(index, /id=\"root\"/);
assert.match(main, /createRoot/);
assert.match(main, /<App \/>/);
assert.match(manifest, /\"display\":\s*\"standalone\"/);
assert.match(manifest, /\"start_url\":\s*\"\/\"/);
assert.match(manifest, /\"orientation\":\s*\"portrait-primary\"/);

// Director: real-source selection, diversity and story roles.
assert.match(director, /selectDirectorMoments/);
assert.match(director, /usedSources/);
assert.match(director, /similarity/);
assert.match(timeline, /hero-ending/);
assert.match(timeline, /pacingIntent/);
assert.match(app, /createAIEditPlan/);
assert.match(app, /renderInspectImprove/);

// Captions: only verified, time-coded speech cues may reach the plan.
assert.match(captions, /verified-speech-cues/);
assert.match(captions, /minimumConfidence/);
assert.match(captions, /captionCueIndex/);
assert.match(app, /applySpeechCaptionsToPlan/);

// Zero-spend soundtrack safety: the API cannot silently invoke paid Lyria audio.
assert.match(musicApi, /zero-cost-local-music/);
assert.match(musicApi, /paidAiMusicDisabled:true/);
assert.match(musicApi, /procedural-original/);
assert.match(music, /local-audio-fallback/);
assert.match(music, /timeoutMs:120000/);
assert.match(music, /attempts:3/);

// Resilient API/media boundary and render QA remain part of the release path.
assert.match(request, /RETRYABLE/);
assert.match(request, /retryableNetwork/);
assert.match(analysis, /requestJson/);
assert.match(qa, /renderInspectImprove/);
assert.match(qa, /maxAttempts/);

// Social/output contracts are present before production release.
assert.match(social, /downloadSocialFilm/);
assert.match(social, /shareSocialFilm/);
assert.match(formats, /OutputFormatEnhancer/);
assert.match(vercel, /rewrites/);

console.log('release-hardening-pass: PASS');
console.log(`checked ${requiredFiles.length} required release files and core safety/browser contracts`);
