/* BIKEZTAGRAM AI — render execution plan.
   Bridges validated timeline cuts to resolved media without changing upload,
   Blob, Gemini, or the protected renderer behaviour. */
import { resolveTimelineSources } from './mediaSourceResolver.js';

export function buildRenderExecutionPlan({ cuts = [], mediaItems = [], targetDuration = 15 } = {}) {
  const resolved = resolveTimelineSources(cuts, mediaItems);
  return {
    targetDuration: Number(targetDuration) || 15,
    cuts: resolved.map((cut, index) => ({
      ...cut,
      renderIndex: index,
      renderReady: cut.sourceReady,
      execution: cut.sourceReady ? {
        source: cut.sourceResolution.url,
        type: cut.sourceResolution.type,
        generated: cut.sourceResolution.generated,
        startTime: Number(cut.startTime) || 0,
        duration: Number(cut.duration) || 0,
      } : null,
    })),
    ready: resolved.every((cut) => cut.sourceReady),
  };
}
