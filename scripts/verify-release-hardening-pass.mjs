import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const mustExist=(path)=>{assert.ok(fs.existsSync(new URL(`../${path}`,import.meta.url)),`Missing required release file: ${path}`);};

// Current V1 release surface. Keep this contract aligned with the no-Gemini,
// browser-local production architecture rather than retired API modules.
const requiredFiles=[
 'index.html','public/manifest.webmanifest','src/main.jsx','src/App.jsx',
 'src/localMediaAnalysis.js','src/localAnalysisRuntime.js','src/aiEditPlanner.js',
 'src/directorSelection.js','src/universalProductionConductor.js','src/universalRenderRuntime.js',
 'src/renderQualityLoop.js','src/renderer.js','src/outputPresets.js',
 'src/audioDirector.js','src/musicCompositionRuntime.js','src/musicRenderBridge.js',
 'src/noGeminiRuntimePolicy.js','vercel.json'
];
requiredFiles.forEach(mustExist);

const app=read('src/App.jsx');
const index=read('index.html');
const manifest=read('public/manifest.webmanifest');
const main=read('src/main.jsx');
const analysis=read('src/localMediaAnalysis.js');
const localRuntime=read('src/localAnalysisRuntime.js');
const planner=read('src/aiEditPlanner.js');
const director=read('src/directorSelection.js');
const conductor=read('src/universalProductionConductor.js');
const render=read('src/universalRenderRuntime.js');
const qa=read('src/renderQualityLoop.js');
const renderer=read('src/renderer.js');
const presets=read('src/outputPresets.js');
const audio=read('src/audioDirector.js');
const music=read('src/musicCompositionRuntime.js');
const musicBridge=read('src/musicRenderBridge.js');
const noGemini=read('src/noGeminiRuntimePolicy.js');
const vercel=read('vercel.json');

// PWA/browser shell.
assert.match(index,/manifest\.webmanifest/);
assert.match(index,/id=\"root\"/);
assert.match(main,/createRoot/);
assert.match(main,/<App \/>/);
assert.match(manifest,/\"display\":\s*\"standalone\"/);
assert.match(manifest,/\"start_url\":\s*\"\/\"/);
assert.match(manifest,/\"orientation\":\s*\"portrait-primary\"/);

// Local-only analysis and planning.
assert.match(analysis,/analyseLocalMedia/);
assert.match(localRuntime,/local-browser-analysis/);
assert.match(planner,/createAIEditPlan/);
assert.match(director,/selectDirectorMoments/);
assert.match(director,/similarity/);
assert.match(conductor,/buildUniversalProduction/);
assert.match(conductor,/without requiring Gemini/i);
assert.match(noGemini,/no-Gemini/i);
assert.doesNotMatch(app,/@google\/genai|GoogleGenAI|GEMINI_API_KEY|gemini-[0-9]/);

// Executable render + QA loop.
assert.match(render,/renderInspectImprove/);
assert.match(render,/buildMusicRenderBridge/);
assert.match(qa,/maxAttempts/);
assert.match(qa,/validateRenderedVideo/);
assert.match(renderer,/renderProject/);
assert.match(renderer,/captureStream/);

// Original audio/music bridge.
assert.match(audio,/planAudioDirector/);
assert.match(music,/buildCompositionRuntime/);
assert.match(musicBridge,/buildMusicRenderBridge/);

// Social/output format contract.
assert.match(presets,/OUTPUT_PRESETS/);
assert.match(presets,/portrait/);
assert.match(presets,/landscape/);
assert.match(presets,/square/);
assert.match(presets,/story/);
assert.match(presets,/cinema/);
assert.match(vercel,/rewrites/);

console.log('release-hardening-pass: PASS');
console.log(`checked ${requiredFiles.length} current V1 release files and no-Gemini/browser-local contracts`);
