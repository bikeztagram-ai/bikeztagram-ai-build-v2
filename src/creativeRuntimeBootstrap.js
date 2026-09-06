/* Universal creative runtime bootstrap. */
import { createUniversalCreativeRuntime } from './universalCreativeEngine.js';
import { compileCreativeIntent } from './creativeIntentCompiler.js';
import { registerCreativeCapability, createCapabilityManifest } from './creativeCapabilityRegistry.js';

export const creativeRuntime = createUniversalCreativeRuntime();

registerCreativeCapability({
  id: 'creative.intent.compile',
  kind: 'director',
  label: 'Creative Intent Compiler',
  description: 'Compiles a free-form brief into renderer/provider-neutral shot intent.',
  input: ['prompt', 'duration', 'shots'],
  output: ['creative-intent-graph'],
  providers: ['local'],
  priority: 100,
  execute: ({ prompt, ...options } = {}) => compileCreativeIntent(prompt, options),
});
registerCreativeCapability({
  id: 'creative.scene.local',
  kind: 'world',
  label: 'Local Scene Generator',
  description: 'Builds deterministic procedural worlds and depth-layer scene graphs.',
  input: ['creative-intent-graph'],
  output: ['scene-graph'],
  providers: ['local'],
  priority: 80,
  execute: ({ prompt, ...options } = {}) => creativeRuntime.createPlan(prompt, options),
});

if (typeof window !== 'undefined') {
  window.__BIKEZTAGRAM_CAPABILITIES__ = Object.freeze({
    localCreativeEngine: true,
    sceneGraphVersion: creativeRuntime.version,
    externalAIDependency: false,
    supportsPromptDirectedWorlds: true,
    supportsRealMediaDirection: true,
    supportsProceduralScenes: true,
    supportsOriginalMusicComposition: true,
    capabilityManifest: createCapabilityManifest(),
  });
}
