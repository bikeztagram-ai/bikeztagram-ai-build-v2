#!/usr/bin/env node
/** Add a truthful, reusable provider failure classifier to the app boundary. */
import fs from 'node:fs';
const file='src/apiRequest.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function classifyRequestFailure')){
 source += `\nexport function classifyRequestFailure(error){\n const status=Number(error?.status)||0;\n if(error?.name==='AbortError') return 'timeout';\n if(status===429) return 'rate-limit';\n if(status>=500) return 'provider-unavailable';\n if(status>=400) return 'request-rejected';\n if(!status) return 'network-unavailable';\n return 'unknown';\n}\n`;
}
fs.writeFileSync(file,source);
console.log('[autobot] Provider failure classification added.');
