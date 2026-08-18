/* BIKEZTAGRAM AI — mixed-media timeline guard.
   Keeps generated media optional and safe: real footage remains the default,
   while ready generated assets can participate through the same timeline. */

function hasSource(scene, mediaItems) {
  const index = Number(scene?.mediaIndex);
  if (Number.isInteger(index) && mediaItems[index]) return true;
  if (scene?.mediaId && mediaItems.some((item) => item?.id === scene.mediaId)) return true;
  return false;
}

export function validateMixedMediaTimeline({ scenes = [], mediaItems = [] } = {}) {
  const issues = [];
  const resolved = [];
  scenes.forEach((scene, index) => {
    const generated = scene?.sourceType === 'generated' || scene?.generated === true;
    if (generated) {
      if (scene.generationStatus !== 'ready') issues.push(`Scene ${index + 1} generated asset is not ready.`);
      if (!scene.assetUrl) issues.push(`Scene ${index + 1} generated asset has no asset reference.`);
      resolved.push({ index, sourceType: 'generated', ready: scene.generationStatus === 'ready' && Boolean(scene.assetUrl) });
      return;
    }
    const ready = hasSource(scene, mediaItems);
    if (!ready) issues.push(`Scene ${index + 1} uploaded source is missing.`);
    resolved.push({ index, sourceType: 'uploaded', ready });
  });

  return {
    ready: scenes.length > 0 && issues.length === 0,
    issues,
    resolved,
    policy: 'uploaded-first; generated assets may join the same timeline only after explicit readiness.'
  };
}

export function canRenderMixedMediaTimeline(input) {
  return validateMixedMediaTimeline(input).ready;
}
