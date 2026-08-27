#!/usr/bin/env node
import fs from 'node:fs';
const file = 'src/socialExport.js';
let source = fs.readFileSync(file, 'utf8');
if (!source.includes('export function buildSocialFilename')) {
  source += `
export function buildSocialFilename(name,presetId='portrait',extension='mp4'){
 const info=SOCIAL_PRESETS[presetId]||SOCIAL_PRESETS.portrait;
 const base=safeFilename(name);
 const ext=String(extension||info.extension||'mp4').replace(/[^a-z0-9]/gi,'').toLowerCase()||'mp4';
 return \`\${base}-\${info.width}x\${info.height}.\${ext}\`;
}
`;
  fs.writeFileSync(file, source);
  console.log('[autobot] Added deterministic social delivery filename helper.');
} else console.log('[autobot] Social delivery filename helper already present.');
