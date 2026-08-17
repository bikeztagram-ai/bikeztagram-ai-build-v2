/* BIKEZTAGRAM AI — generated asset handoff.
 * Keeps generation independent from the renderer while providing a stable
 * timeline-ready asset shape and quality-gated acceptance.
 */

export function createGeneratedAsset({
  jobId,
  prompt,
  filePath,
  duration = 0,
  width = 0,
  height = 0,
  mimeType = 'video/mp4',
} = {}) {
  if (!jobId || !filePath) throw new Error('Generated asset requires jobId and filePath');
  return {
    id: `generated-${jobId}`,
    source: 'ai-generated',
    jobId,
    prompt: String(prompt || '').trim(),
    filePath,
    mimeType,
    duration: Number(duration) || 0,
    width: Number(width) || 0,
    height: Number(height) || 0,
    readyForTimeline: true,
  };
}

export function acceptGeneratedAsset(asset, quality = {}) {
  if (!asset?.readyForTimeline) return { accepted: false, reason: 'asset not ready' };
  if (quality?.passed === false) return { accepted: false, reason: 'quality gate failed', quality };
  if ((Number(asset.duration) || 0) <= 0) return { accepted: false, reason: 'invalid duration' };
  return { accepted: true, asset, quality };
}

export function createTimelineClipFromGeneratedAsset(asset, start = 0) {
  if (!asset?.readyForTimeline) throw new Error('Asset is not timeline-ready');
  return {
    id: `clip-${asset.id}`,
    sourceAssetId: asset.id,
    type: 'video',
    src: asset.filePath,
    start: Number(start) || 0,
    duration: Number(asset.duration) || 0,
    role: 'generated-source',
  };
}
