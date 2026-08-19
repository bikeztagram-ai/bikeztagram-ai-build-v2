/* BIKEZTAGRAM AI — deterministic multi-platform framing planner.
 * This module plans framing only; it never changes editorial order or source timestamps.
 */

const PLATFORM_PRESETS = [
  { id: 'instagram-reels', label: 'Instagram Reels', aspect: '9:16', width: 1080, height: 1920 },
  { id: 'tiktok', label: 'TikTok', aspect: '9:16', width: 1080, height: 1920 },
  { id: 'youtube-shorts', label: 'YouTube Shorts', aspect: '9:16', width: 1080, height: 1920 },
  { id: 'youtube', label: 'YouTube', aspect: '16:9', width: 1920, height: 1080 },
  { id: 'square', label: 'Square', aspect: '1:1', width: 1080, height: 1080 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function focalPoint(analysis) {
  const point = analysis?.subject?.focalPoint || analysis?.focalPoint || {};
  return {
    x: clamp(Number.isFinite(Number(point.x)) ? Number(point.x) : 0.5, 0, 1),
    y: clamp(Number.isFinite(Number(point.y)) ? Number(point.y) : 0.5, 0, 1),
  };
}

function sourceAspect(analysis) {
  const width = Number(analysis?.width ?? analysis?.videoWidth);
  const height = Number(analysis?.height ?? analysis?.videoHeight);
  if (width > 0 && height > 0) return width / height;
  return 16 / 9;
}

export function buildPlatformFraming(analysis = {}, platform = 'instagram-reels') {
  const preset = PLATFORM_PRESETS.find((item) => item.id === platform) ||
    PLATFORM_PRESETS.find((item) => item.id === 'instagram-reels');
  const focal = focalPoint(analysis);
  const source = sourceAspect(analysis);
  const target = preset.width / preset.height;

  // Normalised crop rectangle. Keep the analysed focal point inside it with a
  // small safety margin so platform UI overlays don't immediately hide it.
  let cropWidth = 1;
  let cropHeight = 1;
  if (source > target) cropWidth = clamp(target / source, 0.18, 1);
  else if (source < target) cropHeight = clamp(source / target, 0.18, 1);

  const safeMarginX = Math.min(0.06, cropWidth * 0.15);
  const safeMarginY = Math.min(0.06, cropHeight * 0.15);
  const minX = cropWidth / 2;
  const maxX = 1 - cropWidth / 2;
  const minY = cropHeight / 2;
  const maxY = 1 - cropHeight / 2;
  const centreX = clamp(focal.x, minX + safeMarginX, maxX - safeMarginX);
  const centreY = clamp(focal.y, minY + safeMarginY, maxY - safeMarginY);

  const x = clamp(centreX - cropWidth / 2, 0, 1 - cropWidth);
  const y = clamp(centreY - cropHeight / 2, 0, 1 - cropHeight);

  return {
    id: preset.id,
    label: preset.label,
    output: { aspect: preset.aspect, width: preset.width, height: preset.height },
    crop: {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      width: Number(cropWidth.toFixed(4)),
      height: Number(cropHeight.toFixed(4)),
      focalPoint: { ...focal },
    },
    safeArea: {
      keepSubjectVisible: true,
      focalPoint: { ...focal },
      top: 0.08,
      bottom: 0.14,
      left: 0.06,
      right: 0.06,
    },
    preserveTimeline: true,
    preserveSourceTimestamps: true,
    preserveEditorialOrder: true,
  };
}

export function buildMultiPlatformPlan(analysis = {}) {
  return {
    version: 'platform-reframe-v1',
    preserveTimeline: true,
    preserveSourceTimestamps: true,
    preserveEditorialOrder: true,
    sourceAspect: sourceAspect(analysis),
    platforms: PLATFORM_PRESETS.map((platform) => buildPlatformFraming(analysis, platform.id)),
  };
}
