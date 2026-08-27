#!/usr/bin/env node
/** Add deterministic export validation and wire it into the real export path. */
import fs from 'node:fs';
const file = 'src/socialExport.js';
let source = fs.readFileSync(file, 'utf8');
if (!source.includes('export function validateSocialExport')) {
  source += `\nexport function validateSocialExport(blob,presetId='portrait'){\n const info=getSocialExportInfo(blob,presetId);\n const failures=[];\n if(!(blob instanceof Blob)||!blob.size)failures.push('empty-output');\n if(!Number.isFinite(Number(info.width))||!Number.isFinite(Number(info.height)))failures.push('invalid-dimensions');\n if(Number(info.width)<=0||Number(info.height)<=0)failures.push('invalid-dimensions');\n if(!['portrait','square','landscape'].includes(presetId))failures.push('unknown-profile');\n return {ok:failures.length===0,failures,info};\n}\n`;
}
fs.writeFileSync(file, source);
const appFile = 'src/App.jsx';
let app = fs.readFileSync(appFile, 'utf8');
app = app.replace("import {downloadSocialFilm,shareSocialFilm,getSocialExportInfo} from './socialExport.js';", "import {downloadSocialFilm,shareSocialFilm,getSocialExportInfo,validateSocialExport} from './socialExport.js';");
const target = "const blob=await fetch(renderedUrl).then(r=>r.blob());const info=downloadSocialFilm(blob,{presetId:'portrait',name:plan?.title||'bikeztagram-ai-film'});";
if (!app.includes(target)) throw new Error('Export path marker not found; refusing blind edit.');
const replacement = "const blob=await fetch(renderedUrl).then(r=>r.blob());const validation=validateSocialExport(blob,'portrait');if(!validation.ok)throw new Error(`Export validation failed: ${validation.failures.join(', ')}`);const info=downloadSocialFilm(blob,{presetId:'portrait',name:plan?.title||'bikeztagram-ai-film'});";
app = app.replace(target, replacement);
fs.writeFileSync(appFile, app);
console.log('[autobot] Deterministic social export validation wired into App export.');
