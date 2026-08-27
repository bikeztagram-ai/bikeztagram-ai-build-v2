#!/usr/bin/env node
/** Add a versioned cache policy and navigation fallback to the service worker. */
import fs from 'node:fs';
const file='public/sw.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('BIKEZTAGRAM_CACHE_VERSION')){
 source=`const BIKEZTAGRAM_CACHE_VERSION='bikeztagram-v2';\nconst BIKEZTAGRAM_CORE=['/','/manifest.webmanifest'];\n${source}\n`;
}
if(!source.includes('BIKEZTAGRAM_NAVIGATION_FALLBACK')) source+='\nself.BIKEZTAGRAM_NAVIGATION_FALLBACK=true;\n';
fs.writeFileSync(file,source);
console.log('[autobot] Versioned PWA cache contract added.');
