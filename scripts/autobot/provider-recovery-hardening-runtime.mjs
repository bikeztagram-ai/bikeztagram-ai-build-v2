#!/usr/bin/env node
import fs from 'node:fs';
const file='src/apiRequest.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function classifyApiFailure')){
 source += `\nexport function classifyApiFailure(error){\n const status=Number(error?.status||error?.response?.status||0);\n const message=String(error?.message||error||'').toLowerCase();\n if(status===408||status===504||message.includes('timeout')) return {kind:'timeout',retryable:true};\n if(status===429||message.includes('rate limit')||message.includes('quota')) return {kind:'rate-limit',retryable:true};\n if(status>=500||message.includes('unavailable')||message.includes('service')) return {kind:'provider-unavailable',retryable:true};\n if(!navigatorOnlineSafe()) return {kind:'offline',retryable:true};\n return {kind:'request-failed',retryable:false};\n}\nfunction navigatorOnlineSafe(){return typeof navigator==='undefined'||navigator.onLine!==false;}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added deterministic provider failure classification.');
} else console.log('[autobot] Provider failure classification already present.');
