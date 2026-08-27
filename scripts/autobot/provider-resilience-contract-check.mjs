#!/usr/bin/env node
import fs from 'node:fs';
const source=fs.readFileSync('src/apiRequest.js','utf8');
const required=['classifyRequestFailure','timeout','rate-limit','provider-unavailable','network-unavailable'];
const missing=required.filter(token=>!source.includes(token));
if(missing.length){console.error(`Provider resilience contract failed: ${missing.join(', ')}`);process.exit(1);}
console.log('Provider resilience contract PASS.');
