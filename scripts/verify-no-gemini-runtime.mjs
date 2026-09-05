import { buildNoGeminiCreativePlan, createLocalOriginalMusic, createLocalSceneRequest } from '../src/creativeEngineNoGemini.js';
import { assertNoGeminiRuntime } from '../src/noGeminiRuntimePolicy.js';

const plan = buildNoGeminiCreativePlan({ prompt: 'dark cinematic motorcycle trailer', duration: 15, assets: [] });
if (plan.runtimePolicy?.policy !== 'no-gemini-runtime-v1') throw new Error('No-Gemini runtime policy missing.');
assertNoGeminiRuntime({ localMusic: {}, localVideo: {} });
const music = createLocalOriginalMusic(15, 112);
if (!(music.blob instanceof Blob) || !music.blob.size) throw new Error('Local original music fallback failed.');
const scene = createLocalSceneRequest({ prompt: 'original cinematic establishing insert', duration: 2 });
if (scene.constraints?.originalOnly !== true) throw new Error('Generated scene is not marked original-only.');
console.log('NO-GEMINI RUNTIME VERIFY: PASS');
