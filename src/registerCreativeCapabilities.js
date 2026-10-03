/* Universal capability catalog. Import once at the production boundary before capability resolution. */
import { registerCreativeCapability } from './creativeCapabilityRegistry.js';
import { generateAIVideoScene } from './aiVideoProvider.js';
import { generateAIMusic } from './aiMusicProvider.js';
import { renderUniversalProduction } from './universalRenderRuntime.js';
import { analyzeAudioBlob } from './aiAudioAnalysis.js';

registerCreativeCapability({
  id: 'video.generate', kind: 'generation', label: 'Generate video',
  description: 'Generate a real video asset from a directed visual prompt, with optional image reference.', input: ['prompt', 'duration', 'ratio', 'promptImage'], output: ['video'], providers: ['Runway Gen-4.5'], priority: 100,
  available: () => true, execute: (input) => generateAIVideoScene(input),
});
registerCreativeCapability({
  id: 'music.generate', kind: 'generation', label: 'Generate original music',
  description: 'Generate an original soundtrack with the open-source ACE-Step 1.5 music model.', input: ['prompt', 'durationMs', 'forceInstrumental', 'bpm', 'key', 'mode', 'lyrics'], output: ['audio'], providers: ['ACE-Step 1.5'], priority: 100,
  available: () => true, execute: (input) => generateAIMusic(input),
});
registerCreativeCapability({
  id: 'audio.analyze', kind: 'analysis', label: 'Analyze generated audio',
  description: 'Measure the actual soundtrack for energy, spectral movement, impacts and beat candidates.', input: ['blob'], output: ['audioAnalysis'], providers: ['browser-audio'], priority: 90,
  available: () => Boolean(globalThis.AudioContext || globalThis.webkitAudioContext), execute: (input) => analyzeAudioBlob(input?.blob),
});
registerCreativeCapability({
  id: 'film.render', kind: 'render', label: 'Render finished film',
  description: 'Direct, generate, edit, synchronize, render and QA a complete creative production.', input: ['mediaItems', 'plan', 'prompt', 'duration', 'music', 'outputPreset'], output: ['video', 'qa', 'acceptance'], providers: ['browser-runtime'], priority: 110,
  available: () => true, execute: (input) => renderUniversalProduction(input),
});

export function ensureCreativeCapabilitiesRegistered() { return true; }
