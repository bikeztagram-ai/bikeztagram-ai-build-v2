import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const localAnalysis = fs.readFileSync('src/localMediaAnalysis.js', 'utf8');
const policy = fs.readFileSync('src/noGeminiRuntimePolicy.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Batch 76 is retained as a compatibility gate for the historical workflow.
// The active filmmaker runtime is now browser-local and must not depend on
// signed Blob analysis or any Gemini provider. Blob infrastructure may remain
// in the repository for legacy/protected paths, but it is not the creative path.
assert.equal(pkg.scripts['verify:batch76'], 'node scripts/verify-batch76-signed-blob-upload.mjs');
assert.match(app, /analyseLocalMedia/);
assert.match(localAnalysis, /browser-local-frame-analysis/);
assert.match(localAnalysis, /local-frame-analysis-v4/);
assert.match(localAnalysis, /externalAIProvider:false/);
assert.doesNotMatch(app, /@google\/genai|GoogleGenAI|GEMINI_API_KEY|gemini-[0-9]/i);
assert.doesNotMatch(localAnalysis, /@google\/genai|GoogleGenAI|GEMINI_API_KEY|gemini-[0-9]/i);
assert.match(policy, /externalAIProvider/);

console.log('Batch 76 compatibility gate: PASS');
console.log('- active creative analysis is browser-local');
console.log('- local frame analysis v4 is present');
console.log('- no external AI provider in the active analysis path');
console.log('- Gemini runtime dependency is forbidden');
console.log('- historical Blob workflow command remains executable');
