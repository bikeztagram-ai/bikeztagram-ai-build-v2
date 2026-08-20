import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const client = read('src/universalMediaClient.js');
const upload = read('api/upload.js');
const mediaApi = read('api/analyse-media.js');
const model = read('src/universalMediaModel.js');

const checks = [
  ['client exports universal media intake', /export async function uploadAndAnalyseUniversalMedia/.test(client)],
  ['client routes through universal analyse endpoint', /\/api\/analyse-media/.test(client)],
  ['client supports image and video MIME types', /startsWith\('image\/'\).*startsWith\('video\/'\)/s.test(client)],
  ['client normalizes analysis into universal model', /normalizeUniversalAnalysis/.test(client)],
  ['Blob upload allows images', /image\/jpeg/.test(upload) && /image\/png/.test(upload) && /image\/webp/.test(upload)],
  ['Blob upload preserves video support', /video\/mp4/.test(upload) && /video\/quicktime/.test(upload) && /video\/webm/.test(upload)],
  ['media API dispatches images', /analyseImage/.test(mediaApi) && /startsWith\('image\/'\)/.test(mediaApi)],
  ['media API dispatches video', /analyseVideo/.test(mediaApi) && /startsWith\('video\/'\)/.test(mediaApi)],
  ['universal model is subject agnostic', /uploaded subject/.test(model) && /normalizeSubject/.test(model)],
];

const failures = checks.filter(([, ok]) => !ok);
if (failures.length) {
  console.error('Batch 20 universal media intake client verification FAILED');
  for (const [name] of failures) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`Batch 20 universal media intake client verification PASSED (${checks.length} checks).`);
