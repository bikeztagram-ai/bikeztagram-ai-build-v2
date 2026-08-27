#!/usr/bin/env node
import fs from 'node:fs';
const source=fs.readFileSync('src/director.js','utf8');
if(!source.includes('buildShotMotion')||!source.includes('push-pan')||!source.includes('slow-push')){console.error('Cinematic quality contract failed.');process.exit(1);}
console.log('Cinematic quality contract PASS.');
