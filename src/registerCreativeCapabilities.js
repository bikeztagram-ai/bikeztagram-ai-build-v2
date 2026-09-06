/* Universal capability catalog. Import once at the production boundary before capability resolution. */
import { registerCreativeCapability } from './creativeCapabilityRegistry.js';
import { generateAIVideo } from './aiVideoProvider.js';
import { generateAIMusic } from './aiMusicProvider.js';
import { renderUniversalProduction } from './universalRenderRuntime.js';
import { analyzeAudioBlob } from './aiAudioAnalysis.js';

const envAvailable = (name) => () => Boolean(globalThis?.location && import.meta.env?.[name]);

registerCreativeCapability({
  id: 'video.generate', kind: 'generation', label: 'Generate video',
  description: 'Generate a real video asset from a directed visual prompt and optional image reference.',
  input: ['prompt', 'duration', 'ratio', 'promptImage'], output: ['video'], providers: ['Runway Gen-4.5'], priority: 100,
  available: () => true, execute: (input) => generateAIVideo(input),
});
registerCreativeCapability({
  id: 'music.generate', kind: 'generation', label: 'Generate original music',
  description: 'Generate an original soundtrack from the creative brief.',
  input: ['prompt', 'durationMs', 'forceInstrumental'], output: ['audio'], providers: ['Eleven Music v2'], priority: 100,
  available: () => true, execute: (input) => generateAIMusic(input),
});
registerCreativeCapability({
  id: 'audio.analyze', kind: 'analysis', label: 'Analyze generated audio',
  description: 'Measure the actual soundtrack for energy, spectral movement, impacts and beat candidates.',
  input: ['blob'], output: ['audioAnalysis'], providers: ['browser-audio'], priority: 90,
  available: () => Boolean(globalThis.AudioContext || globalThis.webkitAudioContext), execute: (input) => analyzeAudioBlob(input?.blob),
});
registerCreativeCapability({
  id: 'film.render', kind: 'render', label: 'Render finished film',
  description: 'Direct, generate, edit, synchronize, render and QA a complete creative production.',
  input: ['mediaItems', 'plan', 'prompt', 'duration', 'music', 'outputPreset'], output: ['video', 'qa', 'acceptance'], providers: ['browser-runtime'], priority: 110,
  available: envAvailable('VITE_BIKEZTAGRAM_CREATIVE_RUNTIME'), execute: (input) => renderUniversalProduction(input),
});

export function ensureCreativeCapabilitiesRegistered() { return true; }
