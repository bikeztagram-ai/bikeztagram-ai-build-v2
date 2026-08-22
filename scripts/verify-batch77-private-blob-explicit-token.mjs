import fs from 'node:fs';

const files = ['api/analyse-library.js','api/captions.js'];
for (const file of files) {
  const source = fs.readFileSync(file,'utf8');
  if (!source.includes("process.env.BLOB_READ_WRITE_TOKEN")) throw new Error(`${file}: missing explicit Blob token`);
  if (!source.includes("get(pathname,{access:'private',token})")) throw new Error(`${file}: private Blob get is not explicitly token-authenticated`);
}
console.log('Private Blob explicit-token guard passed.');
