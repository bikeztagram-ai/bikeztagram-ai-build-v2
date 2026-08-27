#!/usr/bin/env node
import fs from 'node:fs';
const source=fs.readFileSync('src/socialExport.js','utf8');
if(!source.includes('validateSocialExportDuration'))throw new Error('Duration validation API missing');
if(!source.includes('duration-mismatch'))throw new Error('Duration mismatch guard missing');
console.log('[autobot] Export duration contract present.');
