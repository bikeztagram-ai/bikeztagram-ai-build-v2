/* BIKEZTAGRAM AI — platform framing plan. */

export const OUTPUT_FORMATS = Object.freeze({
  reels: { width: 1080, height: 1920, aspectRatio: '9:16' },
  tiktok: { width: 1080, height: 1920, aspectRatio: '9:16' },
  shorts: { width: 1080, height: 1920, aspectRatio: '9:16' },
  youtube: { width: 1920, height: 1080, aspectRatio: '16:9' },
  landscape: { width: 1920, height: 1080, aspectRatio: '16:9' },
  square: { width: 1080, height: 1080, aspectRatio: '1:1' },
});

export function buildAutoReframePlan({ platform = 'reels', subject = 'auto', safeArea = 0.1 } = {}) {
  const format = OUTPUT_FORMATS[platform] || OUTPUT_FORMATS.reels;
  return { platform, ...format, subject, safeArea: Math.max(0, Math.min(0.3, Number(safeArea) || 0.1)), strategy: subject === 'auto' ? 'track-primary-subject' : 'lock-subject' };
}

export function buildMultiPlatformPlans(options = {}) {
  const platforms = Array.isArray(options.platforms) && options.platforms.length ? options.platforms : ['reels', 'tiktok', 'youtube'];
  return platforms.map((platform) => buildAutoReframePlan({ ...options, platform }));
}
