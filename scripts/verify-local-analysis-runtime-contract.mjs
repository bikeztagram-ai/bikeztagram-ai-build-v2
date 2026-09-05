import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../src/localAnalysisRuntime.js', import.meta.url), 'utf8');
const analysis = fs.readFileSync(new URL('../src/localMediaAnalysis.js', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

assert.match(main, /installLocalAnalysisRuntime/);
assert.match(runtime, /analyseLocalMedia/);
assert.match(runtime, /local-browser-analysis/);
assert.match(runtime, /createAIEditPlan/);
assert.match(runtime, /\/api\/analyse-media/);
assert.match(runtime, /\/api\/edit-plan/);
assert.match(analysis, /local-frame-analysis-v4/);
assert.match(analysis, /browser frame metrics/);
assert.match(analysis, /URL\.createObjectURL/);
assert.match(app, /analyseLocalMedia/);

// These API-shaped paths are compatibility shims handled entirely in the browser.
// The production runtime must not contain a Gemini dependency or credential path.
assert.doesNotMatch(main, /GEMINI_API_KEY|GoogleGenAI|@google\/genai|gemini-[0-9]/i);
assert.doesNotMatch(runtime, /GEMINI_API_KEY|GoogleGenAI|@google\/genai|gemini-[0-9]/i);
assert.doesNotMatch(analysis, /GEMINI_API_KEY|GoogleGenAI|@google\/genai|gemini-[0-9]/i);
assert.doesNotMatch(app, /GEMINI_API_KEY|GoogleGenAI|@google\/genai|gemini-[0-9]/i);

console.log('Local analysis runtime contract: PASS');
