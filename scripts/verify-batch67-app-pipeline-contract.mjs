import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
for(const token of ['uploadOne','/api/analyse','generateOriginalMusic','renderInspectImprove','downloadSocialFilm','shareSocialFilm']) assert.match(code,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(code,/STEP 1 — Uploading source library/);
assert.match(code,/STEP 2 — Gemini analysing/);
assert.match(code,/STEP 4B — Render → inspect → improve/);
assert.match(code,/Finished AI film created/);
console.log('batch67-app-pipeline-contract: PASS');
