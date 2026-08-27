#!/usr/bin/env node
import fs from 'node:fs';
const file='src/apiRequest.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function getRetryDelay')){
 source += `\nexport function getRetryDelay(attempt,options={}){\n const n=Math.max(0,Number(attempt)||0);\n const base=Math.max(50,Number(options.baseMs)||400);\n const cap=Math.max(base,Number(options.maxMs)||4000);\n return Math.min(cap,Math.round(base*(2**n)));\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added bounded exponential retry delay helper.');
} else console.log('[autobot] Provider retry delay helper already present.');
