import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };

const requiredFiles = [
  'src/App.jsx',
  'src/renderer.js',
  'src/musicGenerator.js',
  'src/renderQualityLoop.js',
  'src/finalAudioMux.js',
  'api/blob-presign.js',
  'api/private-blob-read.js',
  'api/analyse.js',
  'api/analyse-image.js',
  'api/analyse-library.js',
  'api/captions.js',
  'api/generate-music.js',
  'api/render.js',
];
for (const file of requiredFiles) assert(exists(file), `Missing required pipeline file: ${file}`);

if (exists('api/private-blob-read.js')) {
  const helper = read('api/private-blob-read.js');
  assert(helper.includes("process.env.BLOB_READ_WRITE_TOKEN"), 'Private Blob reader does not explicitly use BLOB_READ_WRITE_TOKEN.');
  assert(helper.includes("access: 'private'"), 'Private Blob reader is not using private Blob access.');
  assert(helper.includes('get(resolvedPathname'), 'Private Blob reader does not call the Vercel Blob SDK get() path.');
}

if (exists('api/blob-presign.js')) {
  const presign = read('api/blob-presign.js');
  assert(presign.includes('operations: ["put"]'), 'Blob upload token no longer scopes PUT correctly.');
  assert(presign.includes('operations: ["get"]'), 'Blob read token no longer scopes GET correctly.');
  assert(presign.includes('operation: "get"'), 'Blob presign endpoint no longer creates a signed GET URL.');
  assert(presign.includes('presignedUrl'), 'Blob presign endpoint no longer returns the upload URL.');
  assert(presign.includes('readUrl'), 'Blob presign endpoint no longer returns the read URL.');
}

for (const file of ['api/analyse.js', 'api/analyse-image.js', 'api/captions.js']) {
  if (exists(file)) assert(read(file).includes("./private-blob-read.js"), `${file} is not connected to the shared private Blob reader.`);
}

if (exists('api/analyse-library.js')) {
  const library = read('api/analyse-library.js');
  assert(library.includes("./private-blob-read.js"), 'Mixed-media Gemini analysis is not connected to the shared private Blob reader.');
  assert(library.includes('readPrivateBlob'), 'Mixed-media Gemini analysis does not perform an authenticated Blob read.');
  assert(library.includes('ai.files.upload'), 'Mixed-media Gemini analysis does not upload actual source bytes to Gemini.');
  assert(library.includes('generateContent'), 'Mixed-media Gemini analysis does not run the Gemini director pass.');
}

if (exists('src/App.jsx')) {
  const app = read('src/App.jsx');
  for (const route of ['/api/blob-presign', '/api/analyse-library', '/api/generate-music']) {
    assert(app.includes(route), `App pipeline no longer calls ${route}.`);
  }
  assert(app.includes('renderInspectImprove'), 'App is no longer connected to the autonomous render/QA loop.');
  assert(app.includes('generateOriginalMusic'), 'App is no longer connected to original soundtrack generation.');
}

if (exists('src/musicGenerator.js')) {
  const music = read('src/musicGenerator.js');
  assert(music.includes('createOriginalPulseWav'), 'Music generator has no local original-audio fallback.');
  assert(music.includes('audioAvailable:true'), 'Music generator local fallback does not advertise usable audio.');
  assert(music.includes('audioDataUrl'), 'Music generator does not expose actual audio data to the render pipeline.');
}

if (exists('src/renderQualityLoop.js')) {
  const loop = read('src/renderQualityLoop.js');
  assert(loop.includes('attachGeneratedAudioToVideo'), 'Render QA loop is not connected to final soundtrack muxing.');
  assert(loop.includes('requireAudio: Boolean(musicUrl)'), 'Render QA loop does not validate expected soundtrack audio.');
  assert(loop.includes('renderProject'), 'Render QA loop is not connected to the protected renderer.');
}

if (exists('src/finalAudioMux.js')) {
  const mux = read('src/finalAudioMux.js');
  assert(mux.includes('MediaRecorder'), 'Final audio mux has no browser recorder path.');
  assert(mux.includes('captureStream'), 'Final audio mux cannot capture the rendered video stream.');
  assert(mux.includes('createMediaStreamDestination'), 'Final audio mux cannot create an audio track.');
}

if (exists('package.json')) {
  const pkg = JSON.parse(read('package.json'));
  for (const dep of ['@vercel/blob', '@google/genai', '@ffmpeg/ffmpeg']) assert(pkg.dependencies?.[dep], `Missing required dependency: ${dep}`);
}

if (failures.length) {
  console.error('WHOLE PIPELINE AUDIT: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('WHOLE PIPELINE AUDIT: PASS');
console.log('Blob upload/read, Gemini analysis, local original audio, renderer/QA and final audio mux contracts are present.');
