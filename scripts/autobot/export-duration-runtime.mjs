#!/usr/bin/env node
import fs from 'node:fs';
const file='src/socialExport.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function validateSocialExportDuration')){
 source += `\nexport function validateSocialExportDuration(actualSeconds,targetSeconds,tolerance=0.25){\n const actual=Number(actualSeconds),target=Number(targetSeconds),allowed=Math.max(Number(tolerance)||0,0);\n if(!Number.isFinite(actual)||actual<0||!Number.isFinite(target)||target<=0)return {ok:false,reason:'invalid-duration'};\n return {ok:Math.abs(actual-target)<=allowed,actualSeconds:actual,targetSeconds:target,tolerance:allowed,reason:Math.abs(actual-target)<=allowed?null:'duration-mismatch'};\n}\n`;
}
fs.writeFileSync(file,source);
console.log('[autobot] Added deterministic social export duration validation.');
