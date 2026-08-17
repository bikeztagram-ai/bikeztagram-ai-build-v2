/* BIKEZTAGRAM AI — platform-neutral export profiles. */

export const EXPORT_PROFILES = Object.freeze({
  reels: { width: 1080, height: 1920, fps: 30, maxDuration: 90 },
  shorts: { width: 1080, height: 1920, fps: 30, maxDuration: 180 },
  tiktok: { width: 1080, height: 1920, fps: 30, maxDuration: 600 },
  youtube: { width: 1920, height: 1080, fps: 30, maxDuration: 3600 },
  square: { width: 1080, height: 1080, fps: 30, maxDuration: 600 },
  landscape: { width: 1920, height: 1080, fps: 30, maxDuration: 3600 },
});

export function getExportProfile(platform = 'reels') {
  return EXPORT_PROFILES[platform] || EXPORT_PROFILES.reels;
}

export function validateExport({ platform, duration } = {}) {
  const profile = getExportProfile(platform);
  const seconds = Number(duration) || 0;
  return { valid: seconds > 0 && seconds <= profile.maxDuration, profile, reason: seconds > profile.maxDuration ? 'Duration exceeds profile limit.' : null };
}
