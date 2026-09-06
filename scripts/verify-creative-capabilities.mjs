import fs from 'node:fs';

const files = [
  'src/creativeCapabilityRegistry.js',
  'src/registerCreativeCapabilities.js',
  'src/aiVideoProvider.js',
  'src/aiMusicProvider.js',
  'src/universalRenderRuntime.js',
  'src/aiAudioAnalysis.js',
];
for (const file of files) {
  if (!fs.existsSync(file)) throw new Error(`Missing creative capability file: ${file}`);
}
const source = fs.readFileSync('src/registerCreativeCapabilities.js', 'utf8');
for (const id of ['video.generate', 'music.generate', 'audio.analyze', 'film.render']) {
  if (!source.includes(`id: '${id}'`)) throw new Error(`Capability not registered: ${id}`);
}
if (/gemini/i.test(source)) throw new Error('Gemini reference detected in capability catalog.');
console.log('Creative capabilities: PASS');
