import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../src/localAnalysisRuntime.js', import.meta.url), 'utf8');
const analysis = fs.readFileSync(new URL('../src/localMediaAnalysis.js', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

assert.match(main, /installLocalAnalysisRuntime/);
assert.match(runtime, /analyseLocalMedia/);
assert.match(runtime, /local-browser-analysis/);
assert.match(runtime, /createAIEditPlan/);
assert.match(analysis, /local-frame-analysis-v4/);
assert.match(analysis, /browser frame metrics/);
assert.match(analysis, /URL\.createObjectURL/);
assert.doesNotMatch(main, /GEMINI_API_KEY|GoogleGenAI|@google\/genai/i);
assert.doesNotMatch(runtime, /GEMINI_API_KEY|GoogleGenAI|@google\/genai/i);
assert.doesNotMatch(analysis, /GEMINI_API_KEY|GoogleGenAI|@google\/genai/i);

console.log('Local analysis runtime contract: PASS');
