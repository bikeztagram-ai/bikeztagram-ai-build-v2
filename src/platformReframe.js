/* BIKEZTAGRAM AI — multi-platform framing contract.
   Pure product logic only. No Blob, Gemini, Vercel, upload, or renderer changes.

   The current browser renderer remains vertical 9:16. This module records the
   platform-safe framing intent so a later renderer pass can execute it without
   changing the editorial plan or source timestamps.
*/

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const text = (value) => String(value ?? '').trim();

const PROFILES = Object.freeze({
  reels: Object.freeze({ id: 'reels', label: 'Instagram Reels', width: 1080, height: 1920, aspect: '9:16', safeX: 0.82, safeY: 0.84 }),
  tiktok: Object.freeze({ id: 'tiktok', label: 'TikTok', width: 1080, height: 1920, aspect: '9:16', safeX: 0.80, safeY: 0.80 }),
  shorts: Object.freeze({ id: 'shorts', label: 'YouTube Shorts', width: 1080, height: 1920, aspect: '9:16', safeX: 0.82, safeY: 0.82 }),
  youtube: Object.freeze({ id: 'youtube', label: 'YouTube', width: 1920, height: 1080, aspect: '16:9', safeX: 0.90, safeY: 0.86 }),
  square: Object.freeze({ id: 'square', label: 'Square Social', width: 1080, height: 1080, aspect: '1:1', safeX: 0.88, safeY: 0.88 })
});

function profile(id) {
  const key = text(id).toLowerCase();
  return PROFILES[key] || PROFILES.reels;
}

function focalPoint(analysis) {
  const subject = analysis?.subject || {};
  const x = clamp(num(subject?.focalPoint?.x ?? subject?.composition?.focalPoint?.x, 0.5), 0, 1);
  const y = clamp(num(subject?.focalPoint?.y ?? subject?.composition?.focalPoint?.y, 0.5), 0, 1);
  return { x, y };
}

export function getPlatformProfile(id) {
  return { ...profile(id) };
}

export function buildPlatformFraming(analysis, platform = 'reels') {
  const p = profile(platform);
  const focal = focalPoint(analysis);
  const portrait = p.aspect === '9:16';
  const landscape = p.aspect === '16:9';
  const square = p.aspect === '1:1';

  // Keep the detected subject inside a conservative platform-safe region.
  // Values are intent, not pixel transforms; the renderer can execute them later.
  const cropWidth = portrait ? 0.56 : landscape ? 0.92 : 0.78;
  const cropHeight = portrait ? 0.92 : landscape ? 0.78 : 0.82;
  const left = clamp(focal.x - cropWidth / 2, 0, 1 - cropWidth);
  const top = clamp(focal.y - cropHeight / 2, 0, 1 - cropHeight);

  return {
    platform: p.id,
    label: p.label,
    output: { width: p.width, height: p.height, aspect: p.aspect },
    crop: {
      x: Number(left.toFixed(3)),
      y: Number(top.toFixed(3)),
      width: Number(cropWidth.toFixed(3)),
      height: Number(cropHeight.toFixed(3)),
      focalPoint: focal
    },
    safeArea: {
      width: p.safeX,
      height: p.safeY,
      keepSubjectVisible: true,
      protectText: true
    },
    editorialRule: portrait
      ? 'Prioritise the motorcycle and rider vertically; preserve forward travel direction and avoid cropping the bike wheels when possible.'
      : landscape
        ? 'Preserve the full motorcycle silhouette and environmental context; favour lateral composition and riding direction.'
        : 'Balance motorcycle, rider and environment centrally without sacrificing the hero silhouette.',
    textPlacement: portrait ? 'upper-third-or-lower-safe-area' : square ? 'upper-third-or-lower-safe-area' : 'upper-third',
    rendererReady: false
  };
}

export function buildMultiPlatformPlan(analysis, platforms = ['reels', 'tiktok', 'shorts', 'youtube', 'square']) {
  const ids = Array.isArray(platforms) && platforms.length ? platforms : ['reels'];
  return {
    version: 'platform-reframe-1.0',
    sourceOfTruth: 'same-verified-edit',
    preserveTimeline: true,
    preserveSourceTimestamps: true,
    preserveEditorialOrder: true,
    platforms: ids.map((id) => buildPlatformFraming(analysis, id))
  };
}
