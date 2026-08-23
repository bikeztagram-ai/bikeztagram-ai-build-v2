import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../api/private-blob-read.js',import.meta.url),'utf8');
if(!source.includes('process.env.BLOB_READ_WRITE_TOKEN'))throw new Error('Canonical BLOB_READ_WRITE_TOKEN is not used.');
if(!source.includes('process.env.PUBLIC_BLOB_READ_WRITE_TOKEN'))throw new Error('Legacy compatibility token fallback was removed.');
if(source.indexOf('process.env.BLOB_READ_WRITE_TOKEN')>source.indexOf('process.env.PUBLIC_BLOB_READ_WRITE_TOKEN'))throw new Error('Legacy token must not be the primary token.');
console.log('PASS: Blob reader uses canonical BLOB_READ_WRITE_TOKEN with legacy fallback.');
