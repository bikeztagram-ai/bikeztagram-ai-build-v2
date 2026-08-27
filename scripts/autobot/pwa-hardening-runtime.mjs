#!/usr/bin/env node
/** Version the real shell cache and preserve the existing offline navigation fallback. */
import fs from 'node:fs';
const file='public/sw.js';
let source=fs.readFileSync(file,'utf8');
source=source.replace(/const CACHE_NAME\s*=\s*'[^']+';/, "const CACHE_NAME = 'bikeztagram-shell-v2';");
if(!source.includes("'/icons/icon.svg'")) source=source.replace("'/manifest.webmanifest'", "'/manifest.webmanifest', '/icons/icon.svg'");
if(!source.includes('const BIKEZTAGRAM_CACHE_VERSION')) source="const BIKEZTAGRAM_CACHE_VERSION = CACHE_NAME;\n"+source;
if(!source.includes('BIKEZTAGRAM_NAVIGATION_FALLBACK')) source+="\nconst BIKEZTAGRAM_NAVIGATION_FALLBACK = '/index.html';\n";
source=source.replace("caches.match('/index.html')", "caches.match(BIKEZTAGRAM_NAVIGATION_FALLBACK)");
fs.writeFileSync(file,source);
console.log('[autobot] Functional PWA shell cache versioning hardened.');
