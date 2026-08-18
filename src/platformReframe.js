/* BIKEZTAGRAM AI — non-destructive platform reframing.
   Platform outputs are derived from the same master edit. Source timestamps,
   editorial order and focal subject coordinates remain authoritative. */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const PLATFORM_PRESETS = {
  instagramReel: { name: 'Instagram Reel', aspect: '9:16', width: 1080, height: 1920 },
  tiktok: { name: 'TikTok', aspect: '9:16', width: 1080, height: 1920 },
  youtubeShorts: { name: 'YouTube Shorts', aspect: '9:16', width: 1080, height: 1920 },
  youtube: { name: 'YouTube', aspect: '16:9', width: 1920, height: 1080 },
  square: { name: 'Square Social', aspect: '1:1', width: 1080, height: 1080 },
};

function focalPoint(analysis) {
  const point = analysis?.subject?.focalPoint || {};
  return { x: clamp(Number(point.x) || 0.5, 0, 1), y: clamp(Number(point.y) || 0.5, 0, 1) };
}

function cropForAspect(aspect, point) {
  const ratio = aspect === '9:16' ? 9 / 16 : aspect === '16:9' ? 16 / 9 : 1;
  let width = 1;
  let height = 1;
  if (ratio < 1) width = ratio;
  if (ratio > 1) height = 1 / ratio;
  const x = clamp(point.x - width / 2, 0, 1 - width);
  const y = clamp(point.y - height / 2, 0, 1 - height);
  return { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)), width: Number(width.toFixed(4)), height: Number(height.toFixed(4)), focalPoint: point };
}

export function buildPlatformFraming(analysis = {}, platform = 'instagramReel') {
  const preset = PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.instagramReel;
  const point = focalPoint(analysis);
  return {
    platform,
    name: preset.name,
    output: { aspect: preset.aspect, width: preset.width, height: preset.height },
    crop: cropForAspect(preset.aspect, point),
    safeArea: { keepSubjectVisible: true, focalPoint: point, margin: 0.08 },
    preserveSourceTimestamps: true,
    preserveEditorialOrder: true,
    preserveTimeline: true,
  };
}

export function buildMultiPlatformPlan(analysis = {}) {
  const platforms = Object.keys(PLATFORM_PRESETS).map((key) => buildPlatformFraming(analysis, key));
  return {
    version: 'platform-reframe-v1',
    preserveTimeline: true,
    preserveSourceTimestamps: true,
    preserveEditorialOrder: true,
    subject: analysis?.subject?.description || 'primary subject',
    platforms,
  };
}
