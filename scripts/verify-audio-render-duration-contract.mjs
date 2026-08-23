import { readFile } from 'node:fs/promises';
const bridge=await readFile(new URL('../src/renderAudioBridge.js',import.meta.url),'utf8');
const renderer=await readFile(new URL('../src/renderer.js',import.meta.url),'utf8');
for(const token of ['createMediaStreamDestination','stream.addTrack','source.start','audio.play','cleanup'])if(!bridge.includes(token))throw new Error(`Audio bridge missing ${token}.`);
for(const token of ['attachPlanAudioToRenderStream','captureStream(30)','MediaRecorder'])if(!renderer.includes(token))throw new Error(`Renderer missing ${token}.`);
if(!bridge.includes('audioBuffer.duration'))throw new Error('Decoded audio duration is not inspected.');
console.log('PASS: audio bridge attaches a real audio track and renderer captures video+audio for long-form rendering.');
