import fs from 'node:fs';

const source = fs.readFileSync('api/private-blob-read.js', 'utf8');
if (!source.includes("readMethod: 'signed-get-url'")) throw new Error('Signed GET URL is not the first read path.');
if (!source.includes("fetch(url, { redirect: 'follow', cache: 'no-store' })")) throw new Error('Signed GET reader must bypass stale cache.');
const signed = source.indexOf("if (resolvedUrl)");
const sdk = source.indexOf("if (resolvedPathname && token)");
if (signed < 0 || sdk < 0 || signed > sdk) throw new Error('SDK pathname fallback must come after signed GET URL.');
console.log('PASS: signed Blob GET URL is the authoritative source-media read path.');
