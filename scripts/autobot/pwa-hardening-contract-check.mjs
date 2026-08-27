#!/usr/bin/env node
import fs from 'node:fs';
const sw=fs.readFileSync('public/sw.js','utf8');
const manifest=fs.readFileSync('public/manifest.webmanifest','utf8');
const missing=['BIKEZTAGRAM_CACHE_VERSION','BIKEZTAGRAM_NAVIGATION_FALLBACK'].filter(x=>!sw.includes(x));
if(!manifest.includes('display')||!manifest.includes('start_url')) missing.push('manifest-installability');
if(missing.length){console.error(`PWA contract failed: ${missing.join(', ')}`);process.exit(1);}
console.log('PWA hardening contract PASS.');
