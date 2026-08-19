/* BIKEZTAGRAM AI — single source-of-truth resolver for timeline media. */

function text(value) { return String(value ?? '').trim(); }

export function resolveMediaSource(cut = {}, mediaItems = []) {
  const generated = Boolean(cut.generated || cut.sourceType === 'generated' || cut.sourceType === 'procedural');

  if (generated) {
    const status = text(cut.generationStatus).toLowerCase();
    const url = text(cut.assetUrl || cut.sourceUrl || cut.url || cut.src);
    const type = text(cut.generatedMediaType || cut.type || 'video');
    const ready = Boolean(url) && (!status || status === 'ready' || status === 'complete');
    return {
      ready,
      generated: true,
      url: ready ? url : '',
      type,
      reason: ready ? '' : 'Generated media is not ready.',
    };
  }

  const index = Number(cut.mediaIndex);
  const item = Number.isInteger(index) && index >= 0 ? mediaItems[index] : null;
  if (!item) return { ready: false, generated: false, url: '', type: '', reason: 'Timeline references missing uploaded media.' };

  const url = text(item.sourceUrl || item.url || item.src);
  const type = text(item.type || item.mimeType || 'video/mp4');
  return {
    ready: Boolean(url),
    generated: false,
    url,
    type,
    mediaIndex: index,
    reason: url ? '' : 'Uploaded media has no usable URL.',
  };
}

export function allTimelineSourcesReady(cuts = [], mediaItems = []) {
  const resolved = cuts.map((cut) => resolveMediaSource(cut, mediaItems));
  const issues = resolved
    .map((item, index) => item.ready ? null : `Cut ${index + 1}: ${item.reason}`)
    .filter(Boolean);
  return { ready: issues.length === 0, cuts: resolved, issues };
}
