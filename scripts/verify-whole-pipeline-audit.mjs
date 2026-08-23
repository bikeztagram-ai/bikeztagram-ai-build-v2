import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const exists=(file)=>fs.existsSync(path.join(root,file));
const assert=(condition,message)=>{if(!condition)failures.push(message);};

const requiredFiles=['src/App.jsx','src/renderer.js','src/musicGenerator.js','src/renderQualityLoop.js','src/finalAudioMux.js','api/blob-presign.js','api/analyse.js','api/analyse-image.js','api/analyse-library.js','api/captions.js','api/generate-music.js','api/render.js'];
for(const file of requiredFiles)assert(exists(file),`Missing required pipeline file: ${file}`);
assert(!exists('api/private-blob-read.js'),'Obsolete private Blob helper must not be present.');

if(exists('api/blob-presign.js')){
 const presign=read('api/blob-presign.js');
 assert(presign.includes('operations: ["put"]'),'Blob upload token no longer scopes PUT correctly.');
 assert(presign.includes('operations: ["get"]'),'Blob read token no longer scopes GET correctly.');
 assert(presign.includes('operation: "put"'),'Blob presign endpoint no longer creates a signed PUT URL.');
 assert(presign.includes('operation: "get"'),'Blob presign endpoint no longer creates a signed GET URL.');
 assert(presign.includes('access: "private"'),'Blob presign endpoint no longer binds signed URLs to the private store access mode.');
 assert(presign.includes('useCache: false'),'Blob read URL is not explicitly origin-backed.');
 assert(presign.includes('url: readUrl'),'Blob presign endpoint no longer returns the signed read URL.');
 assert(!presign.includes('presignedUrl.split("?")[0]'),'Blob read URL must not have its authentication query stripped.');
}

for(const file of ['api/analyse.js','api/analyse-image.js','api/captions.js']){
 if(exists(file)){const source=read(file);assert(!source.includes('./private-blob-read.js'),`${file} still depends on the obsolete private Blob helper.`);assert(source.includes('fetch('),`${file} no longer reads its supplied Blob URL.`);}
}
if(exists('api/analyse-library.js')){
 const library=read('api/analyse-library.js');
 assert(!library.includes("from '@vercel/blob'"),'Mixed-media Gemini analysis should consume the signed Blob URL supplied by the upload step, not select a store implicitly.');
 assert(library.includes('fetch(signedUrl'),'Mixed-media Gemini analysis no longer fetches the signed Blob read URL.');
 assert(library.includes('cache:\'no-store\''),'Mixed-media Gemini analysis no longer bypasses stale Blob CDN reads.');
 assert(library.includes('createWriteStream'),'Mixed-media Gemini analysis no longer streams Blob data to temporary storage.');
 assert(library.includes('ai.files.upload'),'Mixed-media Gemini analysis does not upload actual source bytes to Gemini.');
 assert(library.includes('generateContent'),'Mixed-media Gemini analysis does not run the Gemini director pass.');
}
if(exists('src/App.jsx')){
 const app=read('src/App.jsx');
 for(const route of ['/api/blob-presign','/api/analyse-library'])assert(app.includes(route),`App pipeline no longer calls ${route}.`);
 assert(app.includes('renderInspectImprove'),'App is no longer connected to the autonomous render/QA loop.');
 assert(app.includes('generateOriginalMusic'),'App is no longer connected to local original soundtrack generation.');
}
if(exists('src/musicGenerator.js')){
 const music=read('src/musicGenerator.js');
 assert(music.includes('createOriginalPulseWav'),'Music generator has no local original-audio fallback.');
 assert(music.includes('audioAvailable:true'),'Music generator local fallback does not advertise usable audio.');
 assert(music.includes('audioDataUrl'),'Music generator does not expose actual audio data to the render pipeline.');
}
if(exists('src/renderQualityLoop.js')){
 const loop=read('src/renderQualityLoop.js');
 assert(loop.includes('attachGeneratedAudioToVideo'),'Render QA loop is not connected to final soundtrack muxing.');
 assert(loop.includes('requireAudio: Boolean(musicUrl)'),'Render QA loop does not validate expected soundtrack audio.');
 assert(loop.includes('renderProject'),'Render QA loop is not connected to the protected renderer.');
}
if(exists('src/finalAudioMux.js')){
 const mux=read('src/finalAudioMux.js');
 assert(mux.includes('MediaRecorder'),'Final audio mux has no browser recorder path.');
 assert(mux.includes('captureStream'),'Final audio mux cannot capture the rendered video stream.');
 assert(mux.includes('createMediaStreamDestination'),'Final audio mux cannot create an audio track.');
}
if(exists('package.json')){
 const pkg=JSON.parse(read('package.json'));
 for(const dep of ['@vercel/blob','@google/genai','@ffmpeg/ffmpeg'])assert(pkg.dependencies?.[dep],`Missing required dependency: ${dep}`);
}
if(failures.length){console.error('WHOLE PIPELINE AUDIT: FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('WHOLE PIPELINE AUDIT: PASS');
console.log('Signed private Blob upload/read URLs, authenticated Gemini ingestion, local original audio, renderer/QA and final audio mux contracts are present.');
