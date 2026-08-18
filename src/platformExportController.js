import { buildPlatformTranscodePlan, transcodeForPlatform } from './platformOutputRenderer.js';
import { getPlatformProfile } from './platformReframe.js';

const DEFAULT_PLATFORMS = Object.freeze(['reels', 'tiktok', 'shorts', 'youtube', 'square']);

export function normalizePlatformSelection(platforms) {
  const requested = Array.isArray(platforms) && platforms.length ? platforms : ['reels'];
  const unique = [...new Set(requested.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
  return unique.length ? unique : ['reels'];
}

export function buildPlatformExportReadiness(masterBlob, platforms = ['reels']) {
  const selected = normalizePlatformSelection(platforms);
  const errors = [];
  if (!(masterBlob instanceof Blob) || masterBlob.size === 0) errors.push('A completed master video is required before platform export.');
  const outputs = selected.map((platform) => {
    const profile = getPlatformProfile(platform);
    const plan = buildPlatformTranscodePlan(platform);
    return {
      platform,
      label: profile.label,
      output: plan,
      ready: Boolean(masterBlob instanceof Blob && masterBlob.size > 0),
      status: masterBlob instanceof Blob && masterBlob.size > 0 ? 'ready-to-transcode' : 'blocked',
    };
  });
  return {
    version: 1,
    source: 'completed-cinematic-master',
    preservesEdit: true,
    preservesSourceTimestamps: true,
    platforms: outputs,
    valid: errors.length === 0 && outputs.length > 0,
    errors,
  };
}

export async function exportMasterToPlatforms(masterBlob, platforms = ['reels'], options = {}) {
  const readiness = buildPlatformExportReadiness(masterBlob, platforms);
  if (!readiness.valid) throw new Error(readiness.errors.join(' '));
  const results = [];
  for (const item of readiness.platforms) {
    const result = await transcodeForPlatform(masterBlob, item.platform, options[item.platform] || {});
    results.push({
      platform: item.platform,
      label: item.label,
      blob: result.blob,
      profile: result.profile,
      status: 'ready',
    });
  }
  return { readiness, results };
}

export { DEFAULT_PLATFORMS };
