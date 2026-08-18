/* BIKEZTAGRAM AI — common media source resolver.
   Resolves already-available media only. It never uploads, generates, or changes
   Blob/Gemini configuration. */

export function resolveMediaSource(scene, mediaItems = []) {
  if (!scene) return { ready: false, reason: 'Missing scene.' };

  if (scene.sourceType === 'generated' || scene.generated === true) {
    if (scene.generationStatus !== 'ready' || !scene.assetUrl) {
      return { ready: false, reason: 'Generated asset is not ready.' };
    }
    return {
      ready: true,
      type: scene.generatedMediaType || 'image',
      url: scene.assetUrl,
      generated: true,
    };
  }

  const index = Number(scene.mediaIndex);
  const item = Number.isInteger(index) ? mediaItems[index] : null;
  const url = item?.url || item?.src || item?.previewUrl || null;
  if (!url) return { ready: false, reason: 'Uploaded media source is unavailable.' };

  return {
    ready: true,
    type: item?.type || 'video',
    url,
    generated: false,
    mediaIndex: index,
  };
}

export function resolveTimelineSources(cuts = [], mediaItems = []) {
  return cuts.map((cut, index) => ({
    ...cut,
    sourceResolution: resolveMediaSource(cut, mediaItems),
    sourceReady: resolveMediaSource(cut, mediaItems).ready,
    sourceIndex: index,
  }));
}

export function allTimelineSourcesReady(cuts = [], mediaItems = []) {
  const resolved = resolveTimelineSources(cuts, mediaItems);
  return {
    ready: resolved.every((cut) => cut.sourceReady),
    cuts: resolved,
    issues: resolved
      .filter((cut) => !cut.sourceReady)
      .map((cut) => `Cut ${cut.sourceIndex + 1}: ${cut.sourceResolution.reason}`),
  };
}
