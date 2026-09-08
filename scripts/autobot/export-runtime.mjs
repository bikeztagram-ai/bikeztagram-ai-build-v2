#!/usr/bin/env node
/** Add deterministic export validation and wire it into the real export path. */
import fs from 'node:fs';

const file = 'src/socialExport.js';
let source = fs.readFileSync(file, 'utf8');
if (!source.includes('export function validateSocialExport')) {
  source += `\nexport function validateSocialExport(blob,presetId='portrait'){\n const info=getSocialExportInfo(blob,presetId);\n const failures=[];\n if(!(blob instanceof Blob)||!blob.size)failures.push('empty-output');\n if(!Number.isFinite(Number(info.width))||!Number.isFinite(Number(info.height)))failures.push('invalid-dimensions');\n if(Number(info.width)<=0||Number(info.height)<=0)failures.push('invalid-dimensions');\n if(!SOCIAL_PRESETS[presetId])failures.push('unknown-profile');\n return {ok:failures.length===0,failures,info};\n}\n`;
  fs.writeFileSync(file, source);
}

const appFile = 'src/App.jsx';
let app = fs.readFileSync(appFile, 'utf8');

// Keep this runtime migration compatible with the current App export implementation.
if (!app.includes('validateSocialExport')) {
  const importPattern = "import {downloadSocialFilm,shareSocialFilm,getSocialExportInfo} from './socialExport.js';";
  const importReplacement = "import {downloadSocialFilm,shareSocialFilm,getSocialExportInfo,validateSocialExport} from './socialExport.js';";
  if (!app.includes(importPattern)) throw new Error('Export import marker not found; refusing blind edit.');
  app = app.replace(importPattern, importReplacement);
}

if (!app.includes('validateSocialExport(blob,outputPreset)') && !app.includes('validateSocialExport(blob,\'portrait\')')) {
  const blobMarker = "const blob=await fetch(renderedUrl).then(r=>r.blob());";
  const blobIndex = app.indexOf(blobMarker);
  if (blobIndex < 0) throw new Error('Export blob marker not found; refusing blind edit.');
  const insertAt = blobIndex + blobMarker.length;
  const validation = "const validation=validateSocialExport(blob,outputPreset);if(!validation.ok)throw new Error(`Export validation failed: ${validation.failures.join(', ')}`);";
  app = app.slice(0, insertAt) + validation + app.slice(insertAt);
}

fs.writeFileSync(appFile, app);
console.log('[autobot] Deterministic social export validation runtime is compatible and wired.');
