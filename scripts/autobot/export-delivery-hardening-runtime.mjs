#!/usr/bin/env node
import fs from 'node:fs';
const file='src/socialExport.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function buildSocialFilename')){
 source += `\nexport function buildSocialFilename(name,presetId='portrait',extension='mp4'){\n const info=SOCIAL_PRESETS[presetId]||SOCIAL_PRESETS.portrait;\n const base=safeFilename(name);\n const ext=String(extension||info.extension||'mp4').replace(/[^a-z0-9]/gi,'').toLowerCase()||'mp4';\n return \`${base}-${info.width}x${info.height}.${ext}\`;\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added deterministic social delivery filename helper.');
} else console.log('[autobot] Social delivery filename helper already present.');
