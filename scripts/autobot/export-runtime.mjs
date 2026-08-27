#!/usr/bin/env node
/** Add deterministic export validation without changing the protected renderer. */
import fs from 'node:fs';
const file = 'src/socialExport.js';
let source = fs.readFileSync(file, 'utf8');
if (!source.includes('validateSocialExport')) {
  const insertion = `\nexport function validateSocialExport(blob,presetId='portrait'){\n const info=getSocialExportInfo(blob,presetId);\n const failures=[];\n if(!(blob instanceof Blob)||!blob.size)failures.push('empty-output');\n if(!Number.isFinite(Number(info.width))||!Number.isFinite(Number(info.height)))failures.push('invalid-dimensions');\n if(Number(info.width)<=0||Number(info.height)<=0)failures.push('invalid-dimensions');\n if(!['portrait','square','landscape'].includes(presetId))failures.push('unknown-profile');\n return {ok:failures.length===0,failures,info};\n}\n`;
  source += insertion;
}
fs.writeFileSync(file, source);
console.log('[autobot] Deterministic social export validation integrated.');
