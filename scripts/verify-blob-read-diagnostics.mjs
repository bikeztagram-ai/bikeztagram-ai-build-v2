import {pathnameFromBlobUrl} from '../api/private-blob-read.js';
const p=pathnameFromBlobUrl('https://example.public.blob.vercel-storage.com/library%2Fbike%20clip.mp4');
if(p!=='library/bike clip.mp4')throw new Error(`Blob pathname parsing failed: ${p}`);
if(pathnameFromBlobUrl('not-a-url')!=='')throw new Error('Invalid Blob URL should return empty pathname.');
console.log('PASS: canonical Blob pathname diagnostics verified.');
