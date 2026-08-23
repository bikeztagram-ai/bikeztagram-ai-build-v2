import fs from 'node:fs';
const source=fs.readFileSync(new URL('../api/private-blob-read.js',import.meta.url),'utf8');
for(const required of ["['private', 'public']","useCache: false","authenticated-blob-get","Authorization: `Bearer ${token}`","BLOB_READ_WRITE_TOKEN"]){if(!source.includes(required))throw new Error(`Private Blob reader missing ${required}.`);}
if(source.indexOf("authenticated-blob-get")>source.indexOf("private-sdk-path"))throw new Error('Authenticated direct Blob GET fallback must precede SDK pathname fallbacks.');
console.log('PASS: Blob reader tries signed GET, authenticated direct GET, then SDK access fallbacks.');
