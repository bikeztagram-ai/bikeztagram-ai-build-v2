/* BIKEZTAGRAM AI — render execution router.
   Chooses the safest renderer capability without changing the protected renderer.
   Video-only timelines may continue through the stable renderer; mixed/image
   timelines are explicitly marked for the unified media path until that path is
   fully integrated. */

import { prepareRenderMediaSource } from './renderMediaSource.js';

export function routeRenderExecution(execution = {}) {
  if (!execution?.ready) return { ready: false, mode: 'blocked', reason: 'Render execution is not ready.' };

  const cuts = Array.isArray(execution.cuts) ? execution.cuts : [];
  if (!cuts.length) return { ready: false, mode: 'blocked', reason: 'Render execution contains no cuts.' };

  const prepared = cuts.map((cut) => ({
    ...cut,
    mediaSource: prepareRenderMediaSource(cut),
  }));

  const invalid = prepared.filter((cut) => !cut.mediaSource.ready);
  if (invalid.length) {
    return {
      ready: false,
      mode: 'blocked',
      reason: 'One or more render sources are unsupported or unavailable.',
      cuts: prepared,
    };
  }

  const hasImage = prepared.some((cut) => cut.mediaSource.kind === 'image');
  return {
    ready: true,
    mode: hasImage ? 'unified-media-pending' : 'stable-video',
    fallbackAllowed: !hasImage,
    cuts: prepared,
    targetDuration: execution.targetDuration,
  };
}
