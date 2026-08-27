#!/usr/bin/env node
import fs from 'node:fs';
const file='src/socialExport.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function validateSocialFilename')){
 source += `\nexport function validateSocialFilename(filename){\n const value=String(filename||'');\n return {ok:value.length>0&&value.length<=100&&!/[\\\\/:*?\"<>|]/.test(value),filename:value,reason:value.length===0?'empty':value.length>100?'too-long':/[\\\\/:*?\"<>|]/.test(value)?'unsafe-character':null};\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added deterministic export filename validation.');
} else console.log('[autobot] Export filename validation already present.');
