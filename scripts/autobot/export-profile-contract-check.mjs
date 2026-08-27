#!/usr/bin/env node
import fs from 'node:fs';
const source=fs.readFileSync('src/socialExport.js','utf8');
if(!source.includes('getSocialExportProfiles'))throw new Error('Profile metadata API missing');
for(const id of ['portrait','square','landscape'])if(!source.includes(id))throw new Error(`Missing ${id} profile`);
console.log('[autobot] Export profile contract present for portrait, square and landscape.');
