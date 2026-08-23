import fs from 'node:fs';
const source=fs.readFileSync(new URL('../api/private-blob-read.js',import.meta.url),'utf8');
for(const required of ["access,'private'","useCache:false","private-sdk-url","BLOB_READ_WRITE_TOKEN"]){if(!source.includes(required))throw new Error(`Private Blob reader missing ${required}.`);}
if(source.includes("access:'public',token")&&source.indexOf("access:'public',token")<source.indexOf("access:'private',token"))throw new Error('Public SDK path precedes private access path.');
console.log('PASS: private Blob URLs use authenticated private SDK reads before public fallback.');
