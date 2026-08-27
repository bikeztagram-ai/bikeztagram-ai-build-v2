#!/usr/bin/env node
/** Integrate truthful provider failure classification into the shared request boundary. */
import fs from 'node:fs';
const file='src/apiRequest.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function classifyRequestFailure')){
 source += `\nexport function classifyRequestFailure(error){\n const status=Number(error?.status)||0;\n if(error?.name==='AbortError') return 'timeout';\n if(status===429) return 'rate-limit';\n if(status>=500) return 'provider-unavailable';\n if(status>=400) return 'request-rejected';\n if(!status) return 'network-unavailable';\n return 'unknown';\n}\n`;
}
if(!source.includes('error.category = classifyRequestFailure(error)')){
 source=source.replace("error.responseData = data;", "error.responseData = data; error.category = classifyRequestFailure(error);");
 source=source.replace("lastError = error;\n      const abortedByCaller", "error.category = classifyRequestFailure(error);\n      lastError = error;\n      const abortedByCaller");
}
fs.writeFileSync(file,source);
console.log('[autobot] Provider failure classification integrated at the shared request boundary.');
