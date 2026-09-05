/* Local universal creative runtime bootstrap. */
import { createUniversalCreativeRuntime } from './universalCreativeEngine.js';

export const creativeRuntime = createUniversalCreativeRuntime();

if (typeof window !== 'undefined') {
  window.__BIKEZTAGRAM_CAPABILITIES__ = Object.freeze({
    localCreativeEngine: true,
    sceneGraphVersion: creativeRuntime.version,
    externalAIDependency: false,
    supportsPromptDirectedWorlds: true,
    supportsRealMediaDirection: true,
    supportsProceduralScenes: true,
    supportsOriginalMusicComposition: true
  });
}
